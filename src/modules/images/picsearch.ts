import * as utils from "../_utils";
import { MessageEmbed, TextChannel } from "discord.js";
import { ArgumentRequirement, Module, ModuleActionArgument } from "@app/types/Module";
import { Dictionary } from "@app/types/Dictionary";

const portal: Dictionary<string> = {
	kon: "http://konachan.net",
	konachan: "http://konachan.net",
	yan: "https://yande.re",
	yandere: "https://yande.re",
	dan: "https://danbooru.donmai.us",
	danbooru: "https://danbooru.donmai.us"
};

export const fetchList = async (prov = "kon", tags: string[] = [], nsfw = false) => {
	return utils.req2json(portal[prov] + "/post.json?tags=" + tags.filter(a => { return a.indexOf("rating") == -1 || nsfw; }).join('+') + (nsfw ? "" : "+rating:s") + "&limit=100");
};

export const fetchImgObject = async (prov = "kon", id: string) => {
	let res = await utils.req2json(portal[prov] + "/post.json?tags=id:" + id);
	return res[0];
};
// TODO: Localization
export const genEmbed = async (prov = "kon", imageObject: Dictionary<string>, showImage = false, nsfw = false) => {
	if (!Object.keys(imageObject).length) throw new Error("Invalid image " + imageObject);

	let embed = new MessageEmbed()
		.setAuthor("搜尋結果", "https://cdn4.iconfinder.com/data/icons/alphabet-3/500/ABC_alphabet_letter_font_graphic_language_text_" + prov.substr(0, 1).toUpperCase() + "-64.png")
		.setColor((imageObject["rating"] == "s" ? 0x7df28b : (imageObject["rating"] == "q" ? 0xe4ea69 : 0xd37a52)))
		.setDescription("[ID: " + imageObject["id"] + "](" + portal[prov] + "/post/show/" + imageObject["id"] + ")")
		.setTimestamp()
		.addField("來源: ", (imageObject["source"] == "" ? "(未知)" : imageObject["source"].replace("pximg.net", "pixiv.cat")));

	if (showImage && (imageObject['rating'] != "s" || nsfw)) {
		if (["kon", "yan"].includes(prov)) {
			embed.setImage(imageObject["file_url"]);
		} else {
			embed.setImage(imageObject["large_file_url"]);
		}
	}
	return embed;
};

export const module: Module = {
	trigger: Object.keys(portal),
	event: "messageCreate",
	argv: {
		"tags": [ArgumentRequirement.Optional, ArgumentRequirement.Concat]
	},
	action: async (obj: ModuleActionArgument) => {
		const provider = obj.trigger.substr(0, 3);
		const nsfw = (obj.message.channel as TextChannel).nsfw;

		const _msg = await obj.message.channel.send("`獲取資訊……`");

		const list = await fetchList(provider, (obj.argv!.tags ?? "").split(" "), nsfw);

		if (!list.length) {
			return await _msg.edit("`找不到結果。請檢查關鍵字`");
		}

		const imageObject = utils.randomArrayElement(list);

		return await _msg.edit({
			content: " ",
			embeds: [await genEmbed(provider, imageObject, true, (obj.message.channel as TextChannel).nsfw)]
		});
	}
};
