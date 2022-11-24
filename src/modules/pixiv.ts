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
		const res = await req2json(`https://www.pixiv.net/ajax/illust/${illustID}/ugoira_meta?lang=en`) as APIPixivUgoiraMeta;

		if (res.error || Array.isArray(res.body)) {
			return null;
		} else {
			return res.body;
		}
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

	if (illust.type === IllustType.Ugoira) {
		const ugoiraMeta = await fetchUgoiraMeta(illustID);
		if (ugoiraMeta !== null) {
			const arrayBuffer = await (await fetch(ugoiraMeta.originalSrc, {
				headers: {
					"Referer": "https://www.pixiv.net/"
				}
			})).arrayBuffer();
			const zip = await JSZip.loadAsync(arrayBuffer);

			// const match = ugoiraMeta.originalSrc.match(/(\d+)x(\d+)/);
			// assert(match !== null, "Failed to extract width and height from ugoira filename");
			// const width = parseInt(match[1]);
			// const height = parseInt(match[2]);


			// const gifBuffer = await gifEncoder.encode();
			
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
			const gifBuffer = await gif.encode();
			const attachment = new MessageAttachment(Buffer.from(gifBuffer), `${illustID}.gif`);
			files = [attachment];
			embeds[0].image = `attachment://${illustID}.gif`;
		}
	}

	// If the images shouldn't be showed
	if (!showImage || illust.restrict && !isChannelNSFW) {
		embeds = [embeds[0]];
		delete embeds[0].image;
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