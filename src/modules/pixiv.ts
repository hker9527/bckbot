import { error } from "@app/Reporting";
import { LBaseMessageOptions } from "@localizer/MessageOptions";
import { LAPIEmbed } from "@localizer/data/APIEmbed";
import { PrismaClient } from "@prisma/client";
import { StealthModule } from "@type/StealthModule";
import { exec } from "child_process";
import { TextChannel } from "discord.js";
import Ffmpeg from "fluent-ffmpeg";
import { readFileSync, writeFileSync } from "fs";
import { mkdir, rm, writeFile } from "fs/promises";
import { htmlToText } from "html-to-text";
import Pixiv, { PixivIllust } from "pixiv.ts";
import { promisify } from "util";

const client = new PrismaClient();

let pixivClient: Pixiv;

type IllustDetails = PixivIllust & {
	illust_ai_type: number
};

const proxy = (url: string) => url.replace("i.pximg.net", "i.nasu-ser.link"); // DO NOT ABUSE THIS

class Illust {
	protected details: IllustDetails;

	public constructor(illustDetails: IllustDetails) {
		this.details = illustDetails;
	}

	public async toMessage(nsfw: boolean): Promise<LBaseMessageOptions | null> {
		const imageUrls = (this.details.page_count === 1 ?
			[this.details.meta_single_page.original_image_url!] :
			this.details.meta_pages.map((page) => page.image_urls.original))
			.slice(0, 10) // Discord API Limit
			.map(proxy);

		let embeds: LAPIEmbed[];

		// Try to hint the CDN to cache our files
		for (const imageUrl of [proxy(this.details.user.profile_image_urls.medium), ...imageUrls]) {
			await fetch(imageUrl, {
				method: "HEAD"
			});
		}

		embeds = imageUrls.map((url) => ({
			image: {
				url
			},
			url: `https://www.pixiv.net/artworks/${this.details.id}`
		}));

		if (!nsfw && this.details.restrict) {
			embeds = [embeds[0]];
			delete embeds[0].image;
			embeds[0].thumbnail = {
				url: "https://images.emojiterra.com/twitter/v14.0/128px/1f51e.png"
			};
		}

		// Add metadata to the first 
		const prefix = this.details.illust_ai_type > 0 ? "🤖 |" : "";
		const suffix = this.details.page_count > 1 ? `(${this.details.page_count})` : "";

		embeds[0] = {
			...embeds[0],
			...{
				author: {
					name: this.details.title ? `${prefix} ${this.details.title} ${suffix}` : {
						key: `${prefix} $t(pixiv.titlePlaceholder) ${suffix}`
					},
					iconURL: proxy(this.details.user.profile_image_urls.medium),
					url: `https://www.pixiv.net/artworks/${this.details.id}`
				},
				color: this.details.restrict ? 0xd37a52 : 0x3D92F5,
				footer: {
					text: `❤️ ${this.details.total_bookmarks} | 👁️ ${this.details.total_view} | 🗨️ ${this.details.total_comments}`,
					iconURL: "https://s.pximg.net/www/images/pixiv_logo.gif"
				},
				timestamp: new Date(this.details.create_date).toISOString(),
				fields: [{
					name: {
						key: "pixiv.sauceHeader"
					},
					value: {
						key: "pixiv.sauceContent",
						data: { 
							illust_id: this.details.id, 
							author: this.details.user.name, 
							author_id: this.details.user.id
						}
					}
				}, {
					name: {
						key: "pixiv.descriptionHeader"
					},
					value: htmlToText(this.details.caption, {
						limits: {
							maxInputLength: 1500
						},
						tags: { "a": { format: "anchor", options: { ignoreHref: true } } }
					}).substring(0, 1020) || {
						key: "pixiv.descriptionPlaceholder"
					}
				}],
				url: `https://www.pixiv.net/artworks/${this.details.id}`
			}
		};

		return { embeds };
	}
};

class Ugoira extends Illust {
	private zipUrl: string;
	private frames: {
		file: string,
		delay: number
	}[];

	public constructor(illustDetails: IllustDetails) {
		super(illustDetails);

		this.zipUrl = "";
		this.frames = [];
	}

	public async getMeta(): Promise<boolean> {
		try {
			const res = await pixivClient.ugoira.metadata({
				illust_id: +this.details.id
			});
		
			this.zipUrl = res.ugoira_metadata.zip_urls.medium.replace("_ugoira600x600", "_ugoira1920x1080");
			this.frames = res.ugoira_metadata.frames;
			
			return true;
		} catch (e) {
			error("Ugoira->getMeta", e);
			return false;
		}
	}

	public async toMessage(nsfw: boolean): Promise<LBaseMessageOptions | null> {
		if (this.details.restrict && !nsfw) {
			return null;
		}

		// Check for cache
		const cache = await client.pixivCache.findFirst({
			where: {
				id: this.details.id.toString()
			}
		});

		if (cache) {
			// Validate cache
			const imgurRes = await fetch(`https://api.imgur.com/3/image/${cache.hash}`, {
				headers: {
					"Authorization": `Client-ID ${process.env.imgur_id}`
				}
			});

			const imgurResJson = await imgurRes.json();

			if (imgurResJson.success) {
				return {
					content: `https://imgur.com/${cache.hash}`
				};
			} else {
				// Delete cache
				await client.pixivCache.delete({
					where: {
						id: this.details.id.toString()
					}
				});
				// Fall back to normal
			}
		}

		const tmpdir = `/tmp/${this.details.id}`;
		await mkdir(tmpdir);

		// Download zip to tmpdir
		await fetch(this.zipUrl, {
			headers: {
				"Referer": "https://www.pixiv.net/"
			}
		})
			.then(x => x.arrayBuffer())
			.then(x => writeFileSync(`${tmpdir}/ugoira.zip`, Buffer.from(x)));

		// Extract zip by unzip command
		await promisify(exec)(
			`unzip -qq -o ${tmpdir}/ugoira.zip -d ${tmpdir}`
		);

		// Create frame list for concat
		const frameList = this.frames.map(frame => `file '${frame.file}'\nduration ${frame.delay / 1000}`).join("\n");
		await writeFile(`${tmpdir}/input.txt`, frameList);
		
		// Convert frames to mp4
		const command = Ffmpeg(`${tmpdir}/input.txt`, {
			cwd: tmpdir
		})
			.inputFormat("concat")
			.outputOptions([
				"-vsync vfr",
				"-pix_fmt yuv420p"
			])
			.save(`${tmpdir}/output.mp4`)
		
		await new Promise((resolve, reject) => {
			command.on("end", resolve);
			command.on("error", reject);
		});

		command.run();

		// Upload to imgur
		const formData = new FormData();
		formData.append("video", new Blob([readFileSync(`${tmpdir}/output.mp4`)]));
		const imgurRes = await fetch("https://api.imgur.com/3/upload", {
			method: "POST",
			headers: {
				"Authorization": `Client-ID ${process.env.imgur_id}`
			},
			body: formData
		});

		const imgurResJson = await imgurRes.json();
		if (!imgurResJson.success) {
			throw new Error("Failed to upload to imgur: " + JSON.stringify(imgurResJson));
		}

		// Delete tmpdir
		await rm(tmpdir, {
			recursive: true
		});

		// Update database cache
		await client.pixivCache.upsert({
			create: {
				id: this.details.id.toString(),
				type: "u",
				hash: imgurResJson.data.id
			},
			update: {
				type: "u",
				hash: imgurResJson.data.id
			},
			where: {
				id: this.details.id.toString()
			}
		});

		return {
			content: `https://imgur.com/${imgurResJson.data.id}`
		};	
	}
};

export class IllustMessageFactory {
	public id: string;
	private illustDetails: IllustDetails | null;

	public constructor(id: string | number) {
		this.id = id.toString();
		this.illustDetails = null;
	}

	public async getDetail(): Promise<boolean> {
		try {
			this.illustDetails = await pixivClient.illust.detail({
				illust_id: +this.id
			}) as unknown as any;

			return true;
		} catch (e) {
			error("Illust->getDetail", e);
			return false;
		}
	}

	public getType(): "illust" | "ugoira" | null {
		return this.illustDetails?.type ?? null as any;
	}

	public async toMessage(nsfw: boolean): Promise<LBaseMessageOptions | null> {
		if (!this.illustDetails) {
			if (!await this.getDetail()) {
				return null;
			}
		}
		
		let illust: Illust | Ugoira | null = null;

		switch (this.getType()) {
			case "illust":
				illust = new Illust(this.illustDetails!);
				break;
			case "ugoira":
				illust = new Ugoira(this.illustDetails!);
				if (!await (illust as Ugoira).getMeta()) {
					return null;
				}
				break;
			default:
				return null;
		}

		return illust.toMessage(nsfw);
	} 
}

const worker = async () => {
	pixivClient = await Pixiv.refreshLogin(process.env.pixiv_refresh_token!);
};

setInterval(worker, 3000 * 1000);
worker();

export const pixiv: StealthModule = {
	name: "pixiv",
	event: "messageCreate",
	pattern: /(artworks\/|illust_id=)(\d{2,10})/,
	action: async (obj) => {
		const illustID = obj.matches![2];

		if (!isNaN(parseInt(illustID))) {
			const nsfw = (obj.message.channel as TextChannel).nsfw;
			const result = await new IllustMessageFactory(illustID).toMessage(nsfw);
			
			if (result) {
				try {
					await obj.message.suppressEmbeds(true);
					return {
						type: "send",
						result
					}
				} catch (e) { // No permission?
					return false;
				}
			}
		}
		return false;
	}
};