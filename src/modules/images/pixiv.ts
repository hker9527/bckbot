import { report, req2json } from "@app/utils";
import { PixivAPIResponse } from "@type/api/Pixiv";
import { Embed } from "@type/Message/Embed";
import { StealthModule } from "@type/StealthModule";
import { TextChannel } from "discord.js";
import { htmlToText } from "html-to-text";

export const pimg = (url: string) => {
	return url.replace("i.pximg.net", "i.pixiv.cat");
};

export const fetchInfo = async (illust_id: string) => {
	try {
		const res = await req2json(`https://www.pixiv.net/ajax/illust/${illust_id}?lang=ja`) as PixivAPIResponse;

		if (Array.isArray(res.body)) {
			if (res.message === "該当作品は削除されたか、存在しない作品IDです。") {
				return null;
			}
			report("res: " + JSON.stringify(res));
			return null;
		} else {
			return {
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
					tags: { "a": { options: { ignoreHref: true } } }
				}),
				date: res.body.uploadDate,
				restrict: res.body.restrict || res.body.xRestrict
			};
		}
	} catch (e) {
		return null;
	}
};

export const genEmbeds = async (illust_id: string, show_image = true, nsfw = false): Promise<Embed[] | null> => {
	const illust = await fetchInfo(illust_id);
	if (illust === null) {
		return null;
	}

	const embeds: Embed[] = [
		{
			author: {
				name: {
					key: (illust.title || "$t(pixiv.titlePlaceholder)") + (illust.pageCount > 1 ? " (" + illust.pageCount + ")" : "")
				},
				iconURL: "https://s.pximg.net/www/images/pixiv_logo.gif",
				url: `https://www.pixiv.net/artworks/${illust_id}`
			},
			color: illust.restrict ? 0xd37a52 : 0x3D92F5,
			timestamp: new Date(illust.date),
			image: (show_image && !(illust.restrict && !nsfw)) ? `https://pixiv.cat/${illust_id}${(illust.pageCount > 1 ? "-1" : "")}.jpg` : undefined,
			fields: [{
				name: {
					key: "pixiv.sauceHeader"
				},
				value: {
					key: "pixiv.sauceContent",
					data: { illust_id, author: illust.author.name, author_id: illust.author.id }
				}
			}, {
				name: {
					key: "pixiv.descriptionHeader"
				},
				value: illust.description || {
					key: "pixiv.descriptionPlaceholder"
				}
			}],
			url: `https://www.pixiv.net/artworks/${illust_id}`
		}
	];

	if (show_image && !(illust.restrict && !nsfw) && illust.pageCount > 1) {
		for (let i = 2; i < Math.min(illust.pageCount - 1, 3) + 2; i++) {
			embeds.push({
				image: `https://pixiv.cat/${illust_id}-${i}.jpg`,
				url: `https://www.pixiv.net/artworks/${illust_id}`
			});
		}
	}

	return embeds;
};

export const module: StealthModule = {
	event: "messageCreate",
	pattern: /(artworks\/|illust_id=)(\d{1,8})/,
	action: async (obj) => {
		const illust_id = obj.matches![2];

		if (!isNaN(parseInt(illust_id))) {
			const embeds = await genEmbeds(illust_id, true, (obj.message.channel as TextChannel).nsfw);
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