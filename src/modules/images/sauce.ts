import { req2json } from "@app/utils";
import { SaucenaoAPIResponse } from "@type/api/Saucenao";
import { Dictionary } from "@type/Dictionary";
import { Embed } from "@type/Message/Embed";
import { ContextMenuCommand } from "@type/SlashCommand";
import { ApiPortal, fetchList, genEmbed as genMoebooruEmbed } from "./moebooru";
import { genEmbeds as genPixivEmbed } from "./pixiv";
import { findImagesFromMessage } from "./_lib";

type Results = SaucenaoAPIResponse["results"];

const genEmbed = async (result: Results["0"], nsfw: boolean): Promise<Embed> => {
	if ("pixiv_id" in result.data) { // TODO: Check if Moebooru's source is pixiv
		const _embeds = await genPixivEmbed(`${result.data.pixiv_id}`, false, nsfw);
		if (_embeds !== null) {
			return _embeds[0];
		}
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
				const imageObject = imageObjects[0];
				const matches = imageObject.source?.match(/illust_id=(\d{2,})|\d{4}\/\d{2}\/\d{2}\/\d{2}\/\d{2}\/\d{2}\/(\d{2,})_p|artworks\/(\d{2,})|img\/.*?\/(\d{2,})\./);

				if (matches) {
					let embeds = await genPixivEmbed(matches.filter(m => m)[1], false, nsfw);
					if (embeds) return embeds[0];
				}

				// If fetching the original source fails, fallback
				return await genMoebooruEmbed(provider, imageObjects[0], false, nsfw);
			}
		}
	}

	// These types are not supported, but we try to give useful info

	if ("ext_urls" in result.data) {
		return {
			title: "Unknown sauce",
			description: result.data.ext_urls.join("\n"),
			footer: result.header.index_name
		};
	}

	return {
		title: "Unknown sauce",
		footer: result.header.index_name
	};
};

const interactionResults: Dictionary<Results> = {};

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

		const res = await req2json(`https://saucenao.com/search.php?api_key=${process.env.saucenao_key}&db=999&output_type=2&numres=10&url=${url}`) as SaucenaoAPIResponse;

		if (res.header.status === 0) {
			if (res.results === null) {
				return {
					key: "sauce.noSauce"
				};
			}

			// TODO: Select dropdown for user to check other sauces
			const results = res.results.sort((r1, r2) => parseFloat(r1.header.similarity) < parseFloat(r2.header.similarity) ? 1 : -1);
			try {
				interactionResults[interaction.id] = results;

				for (const result of results) {
					const embed = await genEmbed(result, nsfw);
					const similarity = parseFloat(result.header.similarity);

					if (embed) {
						return {
							content: {
								key: "sauce.confidenceLevel",
								data: { similarity }
							},
							embeds: [embed],
							components: [
								[
									{
										type: "SELECT_MENU",
										placeholder: "Another sauce?",
										options: results.map((result, i) => {
											const _similarity = parseFloat(result.header.similarity);
											return {
												emoji: {
													name: _similarity > 90 ? "🟢" : (_similarity > 60 ? "🟡" : "🔴")
												},
												label: `(${result.header.similarity}%) - ${result.header.index_name}`,
												value: `${interaction.id}_${i}`
											}
										}),
										custom_id: "checkOtherSauces"
									}
								]
							]
						};
					}
				}
				throw "Unknown";
			} catch (e) {
				return {
					key: "sauce.noSauce"
				};
			}
		} else {
			return `Error: ${res.header.message}`;
		}
	},
	onSelectMenu: async (interaction) => {
		const nsfw = interaction.channel ? ("nsfw" in interaction.channel ? interaction.channel.nsfw : false) : false;

		const [id, i] = interaction.values[0].split("_");
		const results = interactionResults[id];
		const result = results[parseInt(i)];
		const embed = await genEmbed(result, nsfw);

		if (embed) {
			return {
				content: {
					key: "sauce.confidenceLevel",
					data: { similarity: parseFloat(result.header.similarity) }
				},
				embeds: [embed],
				components: [
					[
						{
							type: "SELECT_MENU",
							placeholder: "Another sauce?",
							options: results.map((result, _i) => {
								const _similarity = parseFloat(result.header.similarity);
								return {
									emoji: {
										name: _similarity > 90 ? "🟢" : (_similarity > 60 ? "🟡" : "🔴")
									},
									label: `(${result.header.similarity}%) - ${result.header.index_name}`,
									value: `${id}_${_i}`,
									default: i === `${_i}`
								}
							}),
							custom_id: "checkOtherSauces"
						}
					]
				]
			};
		}

		return "UwU";
	}
};
