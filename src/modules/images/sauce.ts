import { req2json } from "@app/utils";
import { APISaucenao } from "@type/api/Saucenao";
import { ZAPISaucenaoBase } from "@type/api/saucenao/Base";
import { ZAPISaucenaoEHentai } from "@type/api/saucenao/EHentai";
import { ZAPISaucenaoMoebooru } from "@type/api/saucenao/Moebooru";
import { ZAPISaucenaoPixiv } from "@type/api/saucenao/Pixiv";
import { ZAPISaucenaoTwitter } from "@type/api/saucenao/Twitter";
import { Dictionary } from "@type/Dictionary";
import { Embed } from "@type/Message/Embed";
import { ContextMenuCommand, onFn } from "@type/SlashCommand";
import { ApiPortal, fetchList, genEmbed as genMoebooruEmbed } from "./moebooru";
import { genEmbeds as genPixivEmbed } from "./pixiv";
import { findImagesFromMessage } from "./_lib";

type Results = APISaucenao["results"];

const turn2thumbnail = (embed: Embed) => {
	if (embed.image) {
		embed.thumbnail = embed.image;
		delete embed.image;
	}

	return embed;
};

const genEmbed = async (result: Results["0"], nsfw: boolean): Promise<Embed> => {
	if (ZAPISaucenaoPixiv.check(result.data)) {
		const _embeds = await genPixivEmbed(`${result.data.pixiv_id}`, true, nsfw);
		if (_embeds !== null) {
			return turn2thumbnail(_embeds[0]);
		}
	} else if (ZAPISaucenaoMoebooru.check(result.data)) {
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
					let embeds = await genPixivEmbed(matches.filter(m => m)[1], true, nsfw);
					if (embeds) return turn2thumbnail(embeds[0]);
				}

				// If fetching the original source fails, fallback
				return turn2thumbnail(await genMoebooruEmbed(provider, imageObjects[0], true, nsfw));
			}
		}
	} else if (ZAPISaucenaoEHentai.check(result.data)) {
		// TODO: Fetch gallery info
		return {
			title: "E-Hentai",
			description: [result.data.jp_name, result.data.eng_name].join("\n"),
			footer: result.data.creator.join(", ")
		}
	} else if (ZAPISaucenaoTwitter.check(result.data)) {
		// TODO: Fetch images from twitter
		return {
			title: "Twitter",
			description: result.data.ext_urls[0]
		};
	}

	// These types are not supported, but we try to give useful info

	if (ZAPISaucenaoBase.check(result.data)) {
		return {
			title: "Unknown sauce",
			description: result.data.ext_urls.join("\n"),
			footer: result.header.index_name
		};
	}

	return {
		title: "Unknown sauce",
		description: JSON.stringify(result.data, null, 2),
		footer: result.header.index_name
	};
};

const query = async (id: string, url: string, nsfw: boolean): Promise<ReturnType<onFn<any>>> => {
	const res = await req2json(`https://saucenao.com/search.php?api_key=${process.env.saucenao_key}&db=999&output_type=2&numres=10&url=${url}`) as APISaucenao;

	if (res.header.status === 0) {
		if (res.results === null) {
			return {
				key: "sauce.noSauce"
			};
		}

		// TODO: Select dropdown for user to check other sauces
		const results = res.results.sort((r1, r2) => parseFloat(r1.header.similarity) < parseFloat(r2.header.similarity) ? 1 : -1);
		try {
			interactionResults[id] = results;

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
									placeholder: {
										key: "sauce.another"
									},
									options: results.map((result, i) => {
										const _similarity = parseFloat(result.header.similarity);
										return {
											emoji: {
												name: _similarity > 90 ? "🟢" : (_similarity > 60 ? "🟡" : "🔴")
											},
											label: `(${result.header.similarity}%) - ${result.header.index_name}`,
											value: `${id}_${i}`
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
		return {
			key: "sauce.error",
			data: { error: res.header.message }
		};
	}
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
			return {
				content: {
					key: "sauce.whichImage"
				},
				components: [
					[
						{
							type: "SELECT_MENU",
							options: urls.map((url, i) => ({
								label: `${i + 1}. ${url}`,
								value: url
							})),
							custom_id: "pickURL"
						}
					]
				]
			}
		} else {
			url = urls[0];
		}

		return await query(interaction.id, url, nsfw);
	},
	onSelectMenu: async (interaction) => {
		const nsfw = interaction.channel ? ("nsfw" in interaction.channel ? interaction.channel.nsfw : false) : false;

		switch (interaction.customId) {
			case "pickURL":
				const url = interaction.values[0];
				return await query(interaction.id, url, nsfw);
			case "checkOtherSauces":
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
									placeholder: {
										key: "sauce.another"
									},
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
				break;
		}

		return "UwU";
	}
};
