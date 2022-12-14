import { debug, error } from "@app/Reporting";
import { req2json } from "@app/utils";
import { LocalizableMessageEmbedOptions } from "@localizer/MessageEmbedOptions";
import { APIPixivIllustMeta, IllustType } from "@type/api/pixiv/IllustMeta";
import { APIPixivUgoiraMeta } from "@type/api/pixiv/UgoiraMeta";
import { StealthModule } from "@type/StealthModule";
import { MessageAttachment, TextChannel } from "discord.js";
import { htmlToText } from "html-to-text";
import fetch from "node-fetch";
import JSZip from "jszip";
import assert from "assert-ts";
import { Image, Frame, GIF } from "imagescript";
import FormData from "form-data";
import { PrismaClient } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PixivApi = require("pixiv-api-client");
const pixiv = new PixivApi();

const client = new PrismaClient();

export const fetchIllustMetadata = async (illustID: string) => {
	try {
		const res = await req2json(`https://www.pixiv.net/ajax/illust/${illustID}?lang=en`) as APIPixivIllustMeta;

		if (Array.isArray(res.body)) {
			if (res.message !== "Work has been deleted or the ID does not exist.") {
				debug("pixiv.fetchInfo", "res: " + JSON.stringify(res));
			}
			return null;
		} else {
			return {
				type: res.body.illustType,
				title: res.body.illustTitle,
				pageCount: res.body.pageCount,
				author: {
					id: res.body.userId,
					name: res.body.userName
				},
				description: htmlToText(res.body.description, {
					limits: {
						maxInputLength: 1500
					},
					tags: { "a": { format: "anchor", options: { ignoreHref: true } } }
				}),
				date: res.body.uploadDate,
				restrict: res.body.restrict > 0 || res.body.xRestrict > 0
			};
		}
	} catch (e) {
		error("pixiv.fetchInfo", e);
		return null;
	}
};

const fetchUgoiraMeta = async (illustID: string) => {
	try {
		const res = await pixiv.ugoiraMetaData(illustID) as APIPixivUgoiraMeta;
		return {
			originalSrc: res.ugoira_metadata.zip_urls.medium.replace("_ugoira600x600", "_ugoira1920x1080"),
			frames: res.ugoira_metadata.frames
		};
	} catch (e) {
		error("pixiv.fetchUgoiraMeta", e);
		return null;
	}
};

export const genEmbeds = async (illustID: string, showImage: boolean, isChannelNSFW: boolean) => {
	const illust = await fetchIllustMetadata(illustID);
	if (illust === null) {
		return null;
	}

	let embeds: LocalizableMessageEmbedOptions[];
	let files: MessageAttachment[] | undefined = undefined;

	// Try to hint the CDN to cache our files
	for (let i = 0; i < illust.pageCount; i++) {
		// No need to wait for it
		fetch(`https://pixiv.cat/${illustID}${(illust.pageCount > 1 ? `-${i + 1}` : "")}.jpg`, {
			method: "HEAD"
		});
	}

	embeds = [...new Array(Math.min(illust.pageCount, 4))].map((_, i) => ({
		image: `https://pixiv.cat/${illustID}${illust.pageCount > 1 ? `-${i + 1}` : ""}.jpg`,
		url: `https://www.pixiv.net/artworks/${illustID}`
	}));

	// If the images shouldn't be showed
	if (!showImage || illust.restrict && !isChannelNSFW) {
		embeds = [embeds[0]];
		delete embeds[0].image;
		if (illust.restrict) {
			embeds[0].thumbnail = "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/twitter/322/no-one-under-eighteen_1f51e.png";
		}
	} else if (illust.type === IllustType.Ugoira) {
		// Find if there's a valid cached file
		const cache = await client.pixivCache.findFirst({
			where: {
				id: illustID
			}
		});

		if (cache && +new Date() - +cache.time < 1000 * 60 * 60 * 24) {
			switch (cache.type) {
				case "l": // Litterbox
					embeds[0].image = `https://litter.catbox.moe/${cache.hash}.gif`;
					break;
				// TODO: Add more hosting services?
			}
		} else {
			const ugoiraMeta = await fetchUgoiraMeta(illustID);
			if (ugoiraMeta === null) {
				throw new Error("Failed to fetch ugoira metadata: " + illustID);
			} else {
				const zipResponse = await fetch(ugoiraMeta.originalSrc, {
					headers: {
						"Referer": "https://www.pixiv.net/"
					}
				});
				const zipBuffer = await zipResponse.buffer();
				const zip = await JSZip.loadAsync(zipBuffer);

				const frames: Frame[] = [];
				for (const frameFile of ugoiraMeta.frames) {
					const zipFile = zip.file(frameFile.file);
					assert(zipFile !== null, `Cannot find frame ${frameFile} in zip`);
					const frameData = await zipFile.async("uint8array");
					// Source library does not have type definition
					const image = await (Image as any).decode(frameData) as Image;
					const frame = Frame.from(image, frameFile.delay);
					frames.push(frame);
				}

				const gif = new GIF(frames, -1);
				const gifData = Buffer.from(await gif.encode());

				// Upload to litterbox
				const formData = new FormData();
				formData.append("reqtype", "fileupload");
				formData.append("fileToUpload", gifData, {
					filename: `${illustID}.gif`,
					contentType: "image/gif"
				});
				formData.append("time", "24h");

				const url = await (await fetch("https://litterbox.catbox.moe/resources/internals/api.php", {
					method: "POST",
					body: formData
				})).text();

				assert(url.startsWith("https://litter.catbox.moe/"), "Failed to upload ugoira to litterbox: " + url);

				embeds[0].image = url;

				// Update database cache
				const hash = url.split("/").pop()!.split(".")[0];
				await client.pixivCache.upsert({
					where: {
						id: illustID
					},
					create: {
						id: illustID,
						type: "l",
						hash
					},
					update: {
						type: "l",
						hash
					}
				});
			}
		}
	}

	// Add metadata to the first embed
	embeds[0] = {
		...embeds[0],
		...{
			author: {
				name: illust.title ? illust.title + (illust.pageCount > 1 ? " (" + illust.pageCount + ")" : "") : {
					key: "$t(pixiv.titlePlaceholder)" + (illust.pageCount > 1 ? " (" + illust.pageCount + ")" : "")
				},
				iconURL: "https://s.pximg.net/www/images/pixiv_logo.gif",
				url: `https://www.pixiv.net/artworks/${illustID}`
			},
			color: illust.restrict ? 0xd37a52 : 0x3D92F5,
			timestamp: new Date(illust.date),
			fields: [{
				name: {
					key: "pixiv.sauceHeader"
				},
				value: {
					key: "pixiv.sauceContent",
					data: { illust_id: illustID, author: illust.author.name, author_id: illust.author.id }
				}
			}, {
				name: {
					key: "pixiv.descriptionHeader"
				},
				value: illust.description.substring(0, 1020) || {
					key: "pixiv.descriptionPlaceholder"
				}
			}],
			url: `https://www.pixiv.net/artworks/${illustID}`
		}
	};

	return { embeds, files };
};

const worker = () => {
	pixiv.refreshAccessToken(process.env.pixiv_refresh_token);
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
			const result = await genEmbeds(illustID, true, (obj.message.channel as TextChannel).nsfw);
			if (result) {
				try {
					await obj.message.suppressEmbeds(true);
					return {
						type: "send",
						result: { embeds: result.embeds, files: result.files }
					}
				} catch (e) { // No permission?
					return false;
				}
			}
		}
		return false;
	}
};