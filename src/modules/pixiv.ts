import type { Frames, PixivIllustItem } from "@book000/pixivts";
import { Pixiv } from "@book000/pixivts";
import type { LBaseMessageOptions } from "@localizer/MessageOptions";
import type { LAPIEmbed } from "@localizer/data/APIEmbed";
import { PrismaClient } from "@prisma/client";
import type { StealthModule } from "@type/StealthModule";
import { ZAPIImgur } from "@type/api/Imgur";
import assert from "assert-ts";
import type { TextChannel } from "discord.js";
import { mkdir, rm } from "fs/promises";
import { htmlToText } from "html-to-text";
import { Logger } from "tslog";

const logger = new Logger({
	name: "pixiv",
	minLevel: Bun.env.DEV === "true" ? 0 : 3
});

const client = new PrismaClient();
let pixivClient = await Pixiv.of(process.env.pixiv_refresh_token!);

const proxy = (url: string) => url.replace("i.pximg.net", "i.nasu-ser.link"); // DO NOT ABUSE THIS

class Illust {
	protected sublogger: Logger<any>;
	protected item: PixivIllustItem;

	public constructor(item: PixivIllustItem) {
		this.sublogger = logger.getSubLogger({
			name: "Illust"
		});
		this.item = item;
	}

	public async toMessage(allowNSFW: boolean): Promise<LBaseMessageOptions | null> {
		const sublogger = this.sublogger.getSubLogger({
			name: "toMessage"
		});

		try {
			const imageUrls = (this.item.page_count === 1 ?
				[this.item.meta_single_page.original_image_url!] :
				this.item.meta_pages.map((page) => page.image_urls.original))
				.slice(0, 10) // Discord API Limit
				.map(proxy);
			
			sublogger.debug("imageUrls", imageUrls);

			let embeds: LAPIEmbed[];

			// Try to hint the CDN to cache our files
			for (const imageUrl of [proxy(this.item.user.profile_image_urls.medium), ...imageUrls]) {
				await fetch(imageUrl, {
					method: "HEAD"
				});
			}

			embeds = imageUrls.map((url) => ({
				image: {
					url
				},
				url: `https://www.pixiv.net/artworks/${this.item.id}`
			}));

			if (!allowNSFW && this.item.x_restrict > 0) {
				embeds = [embeds[0]];
				delete embeds[0].image;
				embeds[0].thumbnail = {
					url: "https://images.emojiterra.com/twitter/v14.0/128px/1f51e.png"
				};
			}

			// Add metadata to the first 
			const prefix = this.item.illust_ai_type > 1 ? "🤖 |" : "";
			const suffix = this.item.page_count > 1 ? `(${this.item.page_count})` : "";

			embeds[0] = {
				...embeds[0],
				...{
					author: {
						name: this.item.title ? `${prefix} ${this.item.title} ${suffix}` : {
							key: `${prefix} $t(pixiv.titlePlaceholder) ${suffix}`
						},
						iconURL: proxy(this.item.user.profile_image_urls.medium),
						url: `https://www.pixiv.net/artworks/${this.item.id}`
					},
					color: this.item.x_restrict > 0 ? 0xd37a52 : 0x3D92F5,
					footer: {
						text: `❤️ ${this.item.total_bookmarks} | 👁️ ${this.item.total_view} | 🗨️ ${this.item.total_comments}`,
						iconURL: "https://s.pximg.net/www/images/pixiv_logo.gif"
					},
					timestamp: new Date(this.item.create_date).toISOString(),
					fields: [{
						name: {
							key: "pixiv.sauceHeader"
						},
						value: {
							key: "pixiv.sauceContent",
							data: { 
								illust_id: this.item.id, 
								author: this.item.user.name, 
								author_id: this.item.user.id
							}
						}
					}, {
						name: {
							key: "pixiv.descriptionHeader"
						},
						value: htmlToText(this.item.caption, {
							limits: {
								maxInputLength: 1500
							},
							tags: { "a": { format: "anchor", options: { ignoreHref: true } } }
						}).substring(0, 1020) || {
							key: "pixiv.descriptionPlaceholder"
						}
					}],
					url: `https://www.pixiv.net/artworks/${this.item.id}`
				}
			};

			return { embeds };
		} catch (e) {
			sublogger.error(e);
			return null;
		}
	}
};

class Ugoira extends Illust {
	private zipUrl: string;
	private frames: Frames[];

	public constructor(item: PixivIllustItem) {
		super(item);

		this.sublogger = logger.getSubLogger({
			name: "Ugoira"
		});
		this.zipUrl = "";
		this.frames = [];
	}

	public async getMeta(): Promise<boolean> {
		const sublogger = this.sublogger.getSubLogger({
			name: "getMeta"
		});

		try {
			const res = await pixivClient.ugoiraMetadata({
				illustId: this.item.id
			});
			
			sublogger.debug(res.data);

			this.zipUrl = res.data.ugoira_metadata.zip_urls.medium.replace("_ugoira600x600", "_ugoira1920x1080");
			this.frames = res.data.ugoira_metadata.frames;
			
			return true;
		} catch (e) {
			sublogger.error(e);
			return false;
		}
	}

	public async toMessage(allowNSFW: boolean): Promise<LBaseMessageOptions | null> {
		const sublogger = this.sublogger.getSubLogger({
			name: "toMessage"
		});
		
		try {
			if (this.item.restrict && !allowNSFW) {
				return null;
			}

			// Check for cache
			const cache = await client.pixivCache.findFirst({
				where: {
					id: this.item.id.toString()
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
				if (ZAPIImgur.check(imgurResJson)) {
					return {
						content: `https://imgur.com/${cache.hash}`
					};
				} else {
					// Delete cache
					await client.pixivCache.delete({
						where: {
							id: this.item.id.toString()
						}
					});
					// Fall back to normal
				}
			}

			const tmpdir = `/tmp/${this.item.id}`;
			try {
				await rm(tmpdir, {
					recursive: true
				});
			} catch (e) { }
			await mkdir(tmpdir);

			// Download zip to tmpdir
			await fetch(this.zipUrl, {
				headers: {
					"Referer": "https://www.pixiv.net/"
				}
			})
				.then(x => Bun.write(`${tmpdir}/ugoira.zip`, x));

			// Extract zip by unzip command
			const unzipProc = Bun.spawn(["unzip", "-qq", "-o", `${tmpdir}/ugoira.zip`, "-d", tmpdir]);
			await unzipProc.exited;

			// Create frame list for concat
			const frameList = this.frames.map(frame => `file '${frame.file}'\nduration ${frame.delay / 1000}`).join("\n");
			await Bun.write(`${tmpdir}/input.txt`, frameList);

			// Convert frames to mp4
			const ffmpegProc = Bun.spawn([
				"ffmpeg",
				"-f", "concat",
				"-safe", "0",
				"-i", `${tmpdir}/input.txt`,
				"-vsync", "vfr",
				"-pix_fmt", "yuv420p",
				`${tmpdir}/output.mp4`
			], {
				cwd: tmpdir,
				stdout: null,
				stderr: "pipe"
			});
			await ffmpegProc.exited;
			assert(ffmpegProc.exitCode === 0, `ffmpeg exited with non-zero code ${ffmpegProc.exitCode}\n${await Bun.readableStreamToText(ffmpegProc.stderr)}`);

			// Upload to imgur
			const formData = new FormData();
			formData.append("video", Bun.file(`${tmpdir}/output.mp4`));
			const imgurRes = await fetch("https://api.imgur.com/3/upload", {
				method: "POST",
				headers: {
					"Authorization": `Client-ID ${process.env.IMGUR_ID}`
				},
				body: formData
			});

			const imgurResJson = await imgurRes.json();
			if (!(ZAPIImgur.check(imgurResJson) && imgurResJson.success)) {
				throw new Error("Failed to upload to imgur: " + JSON.stringify(imgurResJson));
			}

			// Delete tmpdir
			await rm(tmpdir, {
				recursive: true
			});

			// Update database cache
			await client.pixivCache.upsert({
				create: {
					id: this.item.id.toString(),
					type: "u",
					hash: imgurResJson.data.id
				},
				update: {
					type: "u",
					hash: imgurResJson.data.id
				},
				where: {
					id: this.item.id.toString()
				}
			});

			return {
				content: `https://imgur.com/${imgurResJson.data.id}`
			};
		} catch (e) {
			sublogger.error(e);
			return null;
		}
	}
};

export class IllustMessageFactory {
	private sublogger = logger.getSubLogger({
		name: "IllustMessageFactory"
	});
	private item: PixivIllustItem | null = null;

	public id: number;

	public constructor(id: number) {
		this.id = id;
	}

	public async getDetail(): Promise<boolean> {
		const sublogger = this.sublogger.getSubLogger({
			name: "getDetail"
		});

		try {
			const res = await pixivClient.illustDetail({
				illustId: this.id
			});
			sublogger.debug(res.data);

			this.item = res.data.illust;	
			return true;
		} catch (e) {
			sublogger.error(e);
			return false;
		}
	}

	public getType(): string | null {
		return this.item?.type ?? null;
	}

	public async toMessage(allowNSFW: boolean): Promise<LBaseMessageOptions | null> {
		const sublogger = this.sublogger.getSubLogger({
			name: "toMessage"
		});

		try {
			if (!this.item) {
				if (!await this.getDetail()) {
					return null;
				}
			}

			let illust: Illust | Ugoira | null = null;

			switch (this.getType()) {
				case "illust":
				case "manga":
					illust = new Illust(this.item!);
					break;
				case "ugoira":
					illust = new Ugoira(this.item!);
					if (!await (illust as Ugoira).getMeta()) {
						return null;
					}
					break;
				default:
					return null;
			}

			return illust.toMessage(allowNSFW);
		} catch (e) {
			sublogger.error(e);
			return null;
		}
	}
}

const worker = async () => {
	const sublogger = logger.getSubLogger({
		name: "worker"
	});

	try {
		sublogger.info("Refreshing Pixiv client");
		pixivClient = await Pixiv.of(process.env.pixiv_refresh_token!);
		sublogger.info("Refreshed Pixiv client");
	} catch (e) {
		sublogger.error(e);
		return;
	}
};
setInterval(worker, 3000 * 1000);

export const pixiv: StealthModule = {
	name: "pixiv",
	event: "messageCreate",
	pattern: /(artworks\/|illust_id=)(\d{2,10})/,
	action: async (obj) => {
		const illustID = obj.matches![2];

		if (!isNaN(parseInt(illustID))) {
			const allowNSFW = (obj.message.channel as TextChannel).nsfw;
			const result = await new IllustMessageFactory(+illustID).toMessage(allowNSFW);
			
			if (result) {
				try {
					await obj.message.suppressEmbeds(true);
				} catch (e) { }

				return {
					type: "reply",
					result
				};
			}
		}
		return false;
	}
};