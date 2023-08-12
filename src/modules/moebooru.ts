import { req2json } from "@app/utils";
import { LAPIEmbed } from "@localizer/data/APIEmbed";
import { APIDanbooru } from "@type/api/Danbooru";
import { APIKonachan } from "@type/api/Konachan";
import { APISankaku } from "@type/api/Sankaku";
import { APIYandere } from "@type/api/Yandere";
import { StealthModule } from "@type/StealthModule";

export enum ApiPortal {
	// eslint-disable-next-line no-unused-vars
	kon = "https://konachan.com/post.json",
	// eslint-disable-next-line no-unused-vars
	yan = "https://yande.re/post.json",
	// eslint-disable-next-line no-unused-vars
	dan = "https://danbooru.donmai.us/posts.json",
	// eslint-disable-next-line no-unused-vars
	san = "https://capi-v2.sankakucomplex.com/posts/keyset"
}

export interface ImageObject {
	id: string,
	rating: "s" | "q" | "e",
	source: string | null,
	file_url: string | null,
	created_at: Date,
	width: number,
	height: number;
}

// TODO: Rewrite as class
export const fetchList = async (provider: keyof typeof ApiPortal, tags: string[] = [], nsfw = false): Promise<ImageObject[]> => {
	let res = await req2json(`${ApiPortal[provider]}?tags=${tags.filter(tag => { return !tag.includes("rating") || nsfw; }).join("+")}${nsfw ? "" : "+rating:s"}&limit=20`);

	switch (provider) {
		case "kon": {
			const result = res as APIKonachan;
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
			const result = res as APIYandere;
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
			const result = res as APIDanbooru;
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
			const result = res as APISankaku;
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

export const genEmbed = (provider: keyof typeof ApiPortal, imageObject: ImageObject, showImage = false, nsfw = false) => {
	const embed: LAPIEmbed = {
		author: {
			name: {
				key: "moebooru.searchResult"
			},
			iconURL: `https://cdn4.iconfinder.com/data/icons/alphabet-3/500/ABC_alphabet_letter_font_graphic_language_text_${provider[0].toUpperCase()}-64.png`
		},
		color: ({
			s: 0x7df28b,
			q: 0xe4ea69,
			e: 0xd37a52
		})[imageObject.rating],
		fields: [{
			name: "Post",
			value: `[${imageObject.id}](${({
				kon: `https://konachan.com/post/show/${imageObject.id}`,
				yan: `https://yande.re/post/show/${imageObject.id}`,
				dan: `https://danbooru.donmai.us/posts/${imageObject.id}`,
				san: `https://sankaku.app/post/show/${imageObject.id}`
			})[provider]})`,
			inline: true
		}, {
			name: {
				key: "moebooru.dimensions"
			},
			value: `${imageObject.width} x ${imageObject.height}`,
			inline: true
		}, {
			name: {
				key: "moebooru.sourceHeader"
			},
			value: (imageObject.source?.length ? imageObject.source : undefined) ?? "(未知)"
		}],
		timestamp: imageObject.created_at.toISOString()
	};

	if (showImage && (imageObject.rating !== "s" || nsfw) && imageObject.file_url) {
		// embed.setImage(imageObject.file_url);
		embed.image = {
			url: imageObject.file_url
		};
	}
	return embed;
};

export const moebooru: StealthModule = {
	name: "moebooru",
	event: "messageCreate",
	action: async () => {
		// TODO: Generate embed like pixiv
		return false;
	}
};
