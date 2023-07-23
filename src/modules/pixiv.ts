import { error } from "@app/Reporting";
import { LocalizableMessageEmbedOptions } from "@localizer/MessageEmbedOptions";
import { StealthModule } from "@type/StealthModule";
import { TextChannel } from "discord.js";
import { htmlToText } from "html-to-text";
import fetch from "node-fetch";
import FormData from "form-data";
import { PrismaClient } from "@prisma/client";
import Pixiv, { PixivIllust } from "pixiv.ts";
import { mkdir, rmdir, writeFile } from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import Ffmpeg from "fluent-ffmpeg";
import { LocalizableMessageOptions } from "@localizer/MessageOptions";

const client = new PrismaClient();

let pixiv: Pixiv;

interface IllustDetails {
	id: string;
	type: string;
	ai: boolean;
	title: string;
	pages: number;
	authorID: string;
	authorName: string;
	description: string;
	date: string;
	restrict: boolean;
	imageUrls: string[];
};

class Illust {
	protected details: IllustDetails;

	public constructor(illustDetails: IllustDetails) {
		this.details = illustDetails;
	}

	public async toMessage(nsfw: boolean): Promise<LocalizableMessageOptions | null> {
		let embeds: LocalizableMessageEmbedOptions[];

		// Try to hint the CDN to cache our files
		for (const imageUrl of this.details.imageUrls) {
			// No need to wait for it
			fetch(imageUrl, {
				method: "HEAD"
			});
		}

		embeds = this.details.imageUrls.map((url: string) => ({
			image: url,
			url: `https://www.pixiv.net/artworks/${this.details.id}`
		}));

		if (!nsfw && this.details.restrict) {
			embeds = [embeds[0]];
			delete embeds[0].image;
			embeds[0].thumbnail = "https://images.emojiterra.com/twitter/v14.0/128px/1f51e.png";
		}

		// Add metadata to the first embed
		embeds[0] = {
			...embeds[0],
			...{
				author: {
					name: this.details.title ? this.details.title + (this.details.pages > 1 ? ` (${this.details.pages})` : "") : {
						key: "$t(pixiv.titlePlaceholder)" + (this.details.pages > 1 ? ` (${this.details.pages})` : "")
					},
					iconURL: "https://s.pximg.net/www/images/pixiv_logo.gif",
					url: `https://www.pixiv.net/artworks/${this.details.id}`
				},
				color: this.details.restrict ? 0xd37a52 : 0x3D92F5,
				timestamp: new Date(this.details.date),
				fields: [{
					name: {
						key: "pixiv.sauceHeader"
					},
					value: {
						key: "pixiv.sauceContent",
						data: { 
							illust_id: this.details.id, 
							author: this.details.authorName, 
							author_id: this.details.authorID
						}
					}
				}, {
					name: {
						key: "pixiv.descriptionHeader"
					},
					value: this.details.description.substring(0, 1020) || {
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
			const res = await pixiv.ugoira.metadata({
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

	public async toMessage(nsfw: boolean): Promise<LocalizableMessageOptions | null> {
		if (this.details.restrict && !nsfw) {
			return null;
		}

		const tmpdir = `/tmp/${this.details.id}`;
		await mkdir(tmpdir);

		// Download zip to tmpdir
		const zipResponse = await fetch(this.zipUrl, {
			headers: {
				"Referer": "https://www.pixiv.net/"
			}
		});
		const fileStream = createWriteStream(`${tmpdir}/ugoira.zip`);
		zipResponse.body.pipe(fileStream);
		
		await new Promise((resolve, reject) => {
			fileStream.on("finish", resolve);
			fileStream.on("error", reject);
			zipResponse.body.on("error", reject);
		});

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
		formData.append("video", createReadStream(`${tmpdir}/output.mp4`));
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
		await rmdir(tmpdir, {
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
			const illustMeta: PixivIllust & {
				illust_ai_type: number
			} = await pixiv.illust.detail({
				illust_id: +this.id
			}) as unknown as any;
			
			this.illustDetails = {
				id: illustMeta.id.toString(),
				type: illustMeta.type,
				ai: illustMeta.illust_ai_type > 0,
				title: illustMeta.title,
				pages: illustMeta.page_count,
				authorID: illustMeta.user.id.toString(),
				authorName: illustMeta.user.name,
				description: htmlToText(illustMeta.caption, {
					limits: {
						maxInputLength: 1500
					},
					tags: { "a": { format: "anchor", options: { ignoreHref: true } } }
				}),
				date: illustMeta.create_date,
				restrict: illustMeta.x_restrict > 0,
				imageUrls: (illustMeta.page_count === 1 ?
					[illustMeta.meta_single_page.original_image_url!] :
					illustMeta.meta_pages.map((page) => page.image_urls.original))
					.slice(0, 10) // Discord API Limit
					.map((url: string) => url.replace("i.pximg.net", "i.nasu-ser.link")) // DON'T ABUSE THIS PLEASE, BUILD YOUR OWN!
			};

			return true;
		} catch (e) {
			error("Illust->getDetail", e);
			return false;
		}
	}

	public getType(): "illust" | "ugoira" | null {
		return this.illustDetails?.type ?? null as any;
	}

	public async toMessage(nsfw: boolean): Promise<LocalizableMessageOptions | null> {
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
	pixiv = await Pixiv.refreshLogin(process.env.pixiv_refresh_token!);
};

setInterval(worker, 3000 * 1000);
worker();

export const module: StealthModule = {
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