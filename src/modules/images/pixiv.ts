import * as utils from "@app/utils";
import {  MessageEmbed, TextChannel } from "discord.js";
import { ArgumentRequirement, Module, ModuleActionArgument } from "@type/Module";
import { PixivApiResponse } from "@type/PixivApiResponse";
import { htmlToText } from 'html-to-text';

export const pimg = (url: string) => {
	return url.replace("i.pximg.net", "i.pixiv.cat");
};

export const fetchInfo = async (illust_id: string) => {
	try {
		const res = await utils.req2json(`https://www.pixiv.net/ajax/illust/${illust_id}?lang=ja`) as PixivApiResponse;

		if (Array.isArray(res.body)) {
			if (res.message === "該当作品は削除されたか、存在しない作品IDです。") {
				throw new Error(`No image found for id ${illust_id} (${res.message})`);
			}
			utils.report("res: " + JSON.stringify(res));
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
					tags: { 'a': { options: { ignoreHref: true } } }
				}),
				date: res.body.uploadDate,
				restrict: res.body.restrict || res.body.xRestrict
			};
		}
	} catch (e) {
		return null;
	}
};

export const genEmbed = async (illust_id: string, show_image = true, nsfw = false) => {
	const illust = await fetchInfo(illust_id);
	if (illust === null) {
		return null;
	}

	return new MessageEmbed()
		.setAuthor(
			(illust.title || "Pixiv圖片") + (illust.pageCount > 1 ? " (" + illust.pageCount + ")" : ""),
			"https://s.pximg.net/www/images/pixiv_logo.gif"
		)
		.setColor(illust.restrict ? 0xd37a52 : 0x3D92F5)
		.setTimestamp(new Date(illust.date))
		.setImage((show_image && !(illust.restrict && !nsfw)) ? `https://pixiv.cat/${illust_id}${(illust.pageCount > 1 ? "-1" : "")}.jpg` : "")
		.addField(
			"Sauce: ",
			"[ID: " + illust_id + "](https://www.pixiv.net/member_illust.php?mode=medium&illust_id=" + illust_id + ")\t[作者: " + illust.author.name + "]( https://www.pixiv.net/member.php?id=" + illust.author.id + ")"
		)
		.addField(
			"說明: ",
			illust.description || "(無)"
		);
};

export const module: Module = {
	trigger: ["pixiv", "*pixiv"],
	event: "messageCreate",
	argv: {
		"id": [ArgumentRequirement.Optional]
	},
	action: async (obj: ModuleActionArgument) => {
		const stealth = obj.trigger[0] === "*";

		let illust_id = "";
		if (stealth) { // auto detection
			const tmp = obj.message.content.match(/(artworks\/|illust_id=)(\d{1,8})/);
			if (tmp) illust_id = tmp[2];
		} else if (obj.argv!.id) {
			const tmp = obj.argv!.id.match(/(\d{1,8})/)!;
			if (tmp) illust_id = tmp[1];
		}

		if (!isNaN(parseInt(illust_id))) {
			const embed = await genEmbed(illust_id, true, (obj.message.channel as TextChannel).nsfw);
			if (embed) {
				try {
					await obj.message.suppressEmbeds(true);
					return await obj.message.channel.send({ embeds: [embed] });
				} catch (e) { // No permission?
					throw e;
				}
			} else {
				if (!stealth) {
					return await obj.message.reply("Can't find it");
				}
			}
			return false;
		}
		return false;
	}
};
