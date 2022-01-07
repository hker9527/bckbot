import { req2json } from "@app/utils";
import { SaucenaoApiResponse } from "@type/api/Saucenao";
import { Embed } from "@type/Message/Embed";
import { ContextMenuCommand } from "@type/SlashCommand";
import { ApiPortal, fetchList, genEmbed as genMoebooruEmbed } from "./moebooru";
import { genEmbed as genPixivEmbed } from "./pixiv";
import { findImagesFromMessage } from "./_lib";

export const module: ContextMenuCommand = {
	name: {
		key: "sauce.name"
	},
	type: "MESSAGE",
	defer: true,
	onContextMenu: async (interaction) => {
		const message = interaction.getMessage();
		const nsfw = interaction.channel ? ("nsfw" in interaction.channel ? interaction.channel.nsfw : false) : false;

		// Attachment shows first, then embeds.
		const urls = findImagesFromMessage(message);
		let url;

		if (!urls.length) {
			return {
				key: "sauce.invalidUrl"
			};
		} else if (urls.length > 1) {
			// TODO: Give select menu for user to pick which one
			url = urls[0];
		} else {
			url = urls[0];
		}

		const res = await req2json(`https://saucenao.com/search.php?api_key=${process.env.saucenao_key}&db=999&output_type=2&numres=10&url=${url}`) as SaucenaoApiResponse;

		if (res.header.status === 0) {
			if (res.results === null) {
				return {
					key: "sauce.noSauce"
				};
			}

			// TODO: Select dropdown for user to check other sauces
			const results = res.results.sort((r1, r2) => parseFloat(r1.header.similarity) < parseFloat(r2.header.similarity) ? 1 : -1);
			try {
				for (const result of results) {
					const similarity = parseFloat(result.header.similarity);

					let embed: Embed | null = null;
					if ("pixiv_id" in result.data) { // TODO: Check if Moebooru's source is pixiv
						const _embed = await genPixivEmbed(`${result.data.pixiv_id}`, false, nsfw);
						if (_embed === null) {
							// return {
							// 	key: "sauce.postNotFound",
							// 	data: {
							// 		url: result.data.pixiv_id
							// 	}
							// };

							// Go to next sauce
							continue;
						}
						embed = _embed;
					} else if ("creator" in result.data) { // MoebooruData
						let provider: keyof typeof ApiPortal | null = null;
						let id: number | null = null;

						if ("yandere_id" in result.data) {
							provider = "yan";
							id = result.data.yandere_id ?? null;
						} else if ("konachan_id" in result.data) {
							provider = "kon";
							id = result.data.konachan_id ?? null;
						} else if ("danbooru_id" in result.data) {
							provider = "dan";
							id = result.data.danbooru_id ?? null;
						} else if ("gelbooru_id" in result.data) {
							provider = "dan";
							id = result.data.gelbooru_id ?? null;
						} else if ("sankaku_id" in result.data) {
							provider = "san";
							id = result.data.sankaku_id ?? null;
						}

						if (provider !== null && id !== null) {
							const imageObjects = await fetchList(provider, [`id:${id}`], nsfw);
							if (imageObjects.length > 0) {
								embed = await genMoebooruEmbed(provider, imageObjects[0], false, nsfw);
							}
						}
					}
					if (embed) {
						return {
							content: {
								key: "sauce.confidenceLevel",
								data: { similarity }
							},
							embeds: [embed]
						};
					}
				}
				throw "Unknown";
			} catch (e) {
				// No suitable sauce found.... Default to the highest confidence one.
				// TODO: Beautify

				return {
					key: "sauce.unknown",
					data: {
						json: JSON.stringify(results[0], null, 4)
					}
				}
			}
		} else {
			return `Error: ${res.header.message}`;
		}
	}
};
