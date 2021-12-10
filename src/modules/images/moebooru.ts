import { getString, Languages } from "@app/i18n";
import { enumStringKeys, randomArrayElement, req2json } from '@app/utils';
import { DanbooruApiResponse } from '@type/api/Danbooru';
import { KonachanApiResponse } from '@type/api/Konachan';
import { StealthModule } from '@type/StealthModule';
import { SankakuApiResponse } from '@type/api/Sankaku';
import { YandereApiResponse } from '@type/api/Yandere';
import { MessageEmbed, TextChannel } from 'discord.js';

export enum ApiPortal {
	kon = "https://konachan.com/post.json",
	yan = "https://yande.re/post.json",
	dan = "https://danbooru.donmai.us/posts.json",
	san = "https://capi-v2.sankakucomplex.com/posts/keyset"
};

export type ImageObject = {
	id: string,
	rating: "s" | "q" | "e",
	source: string | null,
	file_url: string | null,
	created_at: Date,
	width: number,
	height: number;
};

export const fetchList = async (provider: keyof typeof ApiPortal, tags: string[] = [], nsfw = false): Promise<ImageObject[]> => {
	let res = await req2json(`${ApiPortal[provider]}?tags=${tags.filter(tag => { return !tag.includes("rating") || nsfw; }).join('+')}${nsfw ? "" : "+rating:s"}&limit=20`);

	switch (provider) {
		case "kon": {
			const result = res as KonachanApiResponse;
			return result.map(a => {
				return {
					id: `${a.id}`,
					rating: a.rating,
					source: a.source,
					file_url: a.file_url,
					created_at: new Date(a.created_at * 1000),
					width: a.width,
					height: a.height
				};
			});
		}
		case "yan": {
			const result = res as YandereApiResponse;
			return result.map(a => {
				return {
					id: `${a.id}`,
					rating: a.rating,
					source: a.source,
					file_url: a.file_url,
					created_at: new Date(a.created_at * 1000),
					width: a.width,
					height: a.height
				};
			});
		}
		case "dan": {
			const result = res as DanbooruApiResponse;
			return result.map(a => {
				return {
					id: `${a.id}`,
					rating: a.rating,
					source: a.source,
					file_url: a.large_file_url ?? a.file_url ?? a.preview_file_url ?? null,
					created_at: new Date(a.created_at),
					width: a.image_width,
					height: a.image_height
				};
			});
		}
		case "san": {
			const result = res as SankakuApiResponse;
			return result.data.map(a => {
				return {
					id: `${a.id}`,
					rating: a.rating,
					source: a.source,
					file_url: a.file_url ?? a.sample_url ?? a.preview_url ?? null,
					created_at: new Date(a.created_at.s * 1000),
					width: a.width,
					height: a.height
				};
			});
		}
	}
};

export const genEmbed = async (provider: keyof typeof ApiPortal, imageObject: ImageObject, showImage = false, nsfw = false, locale: Languages) => {
	const embed = new MessageEmbed()
		.setAuthor(getString('moebooru.searchResult', locale), `https://cdn4.iconfinder.com/data/icons/alphabet-3/500/ABC_alphabet_letter_font_graphic_language_text_${provider[0].toUpperCase()}-64.png`)
		.setColor(({
			s: 0x7df28b,
			q: 0xe4ea69,
			e: 0xd37a52
		})[imageObject.rating])
		.addField("Post", `[${imageObject.id}](${({
			kon: `https://konachan.com/post/show/${imageObject.id}`,
			yan: `https://yande.re/post/show/${imageObject.id}`,
			dan: `https://danbooru.donmai.us/posts/${imageObject.id}`,
			san: `https://sankaku.app/post/show/${imageObject.id}`
		})[provider]})`, true)
		.addField(getString('moebooru.dimensions', locale), `${imageObject.width} x ${imageObject.height}`, true)
		.addField(getString('moebooru.sourceHeader', locale), imageObject.source?.replace(/https:\/\/i.pximg.net\/img-original\/img\/\d{4}\/(\d{2}\/){5}(\d+)_p\d+\..+/, "https://www.pixiv.net/artworks/$2") ?? "(未知)")
		.setTimestamp(imageObject.created_at);

	if (showImage && (imageObject.rating != "s" || nsfw) && imageObject.file_url) {
		embed.setImage(imageObject.file_url);
	}
	return embed;
};

export const module: StealthModule = {
	event: "messageCreate",
	action: async (obj) => {
		// const provider = obj.trigger.substr(0, 3) as keyof typeof ApiPortal;
		// const nsfw = (obj.message.channel as TextChannel).nsfw;

		// const list = await fetchList(provider, (obj.argv!.tags ?? "").split(" "), nsfw);

		// if (!list.length) {
		// 	return await obj.message.reply("`找不到結果。請檢查關鍵字`");
		// }

		// const imageObject = utils.randomArrayElement(list);

		// return await obj.message.reply({
		// 	embeds: [await genEmbed(provider, imageObject, true, (obj.message.channel as TextChannel).nsfw, obj.message.getLocale())]
		// });
		return false;
	}
};
