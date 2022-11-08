import { debug, error } from "@app/Reporting";
import { req2json } from "@app/utils";
import { LocalizableMessageEmbedOptions } from "@localizer/MessageEmbedOptions";
import { APIPixivIllustMeta } from "@type/api/pixiv/IllustMeta";
import { APIPixivUgoiraMeta } from "@type/api/pixiv/UgoiraMeta";
import { StealthModule } from "@type/StealthModule";
import { TextChannel } from "discord.js";
import { htmlToText } from "html-to-text";
import fetch from "node-fetch";

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

export const genEmbeds = async (illustID: string, showImage: boolean, isChannelNSFW: boolean): Promise<LocalizableMessageEmbedOptions[] | null> => {
	const illust = await fetchIllustMetadata(illustID);
	if (illust === null) {
		return null;
	}

	// Try to hint the CDN to cache our files
	for (let i = 0; i < illust.pageCount; i++) {
		// No need to wait for it
		fetch(`https://pixiv.cat/${illustID}${(illust.pageCount > 1 ? `-${i + 1}` : "")}.jpg`, {
			method: "HEAD"
		});
	}

	let embeds: LocalizableMessageEmbedOptions[] = [...new Array(Math.min(illust.pageCount, 4))].map((_, i) => ({
		image: `https://pixiv.cat/${illustID}${illust.pageCount > 1 ? `-${i + 1}` : ""}.jpg`,
		url: `https://www.pixiv.net/artworks/${illustID}`
	}));

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
				value: illust.description || {
					key: "pixiv.descriptionPlaceholder"
				}
			}],
			url: `https://www.pixiv.net/artworks/${illustID}`
		}
	};

	return embeds;
};

export const module: StealthModule = {
	name: "pixiv",
	event: "messageCreate",
	pattern: /(artworks\/|illust_id=)(\d{2,10})/,
	action: async (obj) => {
		const illustID = obj.matches![2];

		if (!isNaN(parseInt(illustID))) {
			const embeds = await genEmbeds(illustID, true, (obj.message.channel as TextChannel).nsfw);
			if (embeds) {
				try {
					await obj.message.suppressEmbeds(true);
					return {
						type: "send",
						result: { embeds }
					}
				} catch (e) { // No permission?
					return false;
				}
			}
		}
		return false;
	}
};