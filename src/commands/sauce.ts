import { error } from "@app/Reporting";
import { req2json } from "@app/utils";
import { LocalizableInteractionReplyOptions } from "@localizer/InteractionReplyOptions";
import { LocalizableMessageEmbedOptions } from "@localizer/MessageEmbedOptions";
import { ApiPortal, fetchList, genEmbed as genMoebooruEmbed } from "@module/moebooru";
import { APISaucenao } from "@type/api/Saucenao";
import { ZAPISaucenaoBase } from "@type/api/saucenao/Base";
import { ZAPISaucenaoEHentai } from "@type/api/saucenao/EHentai";
import { ZAPISaucenaoMoebooru } from "@type/api/saucenao/Moebooru";
import { ZAPISaucenaoPixiv } from "@type/api/saucenao/Pixiv";
import { ZAPISaucenaoTwitter } from "@type/api/saucenao/Twitter";
import { Command } from "@type/Command";
import { Dictionary } from "@type/Dictionary";
import { IllustMessageFactory } from "../modules/pixiv";
import { findImagesFromMessage } from "./_lib";

type Results = APISaucenao["results"];

const turn2thumbnail = (embed: LocalizableMessageEmbedOptions) => {
	embed.thumbnail = embed.image;
	delete embed.image;

	return embed;
};

const genPixivEmbed = async (pixiv_id: number | string, nsfw: boolean) => {
	const illustMessageFactory = new IllustMessageFactory(pixiv_id);
	await illustMessageFactory.getDetail();
	if (illustMessageFactory.getType() === "illust") {
		const message = await illustMessageFactory.toMessage(nsfw);
		if (message !== null) {
			if (Array.isArray(message.embeds) && "image" in message.embeds[0]) {
				return turn2thumbnail(message.embeds[0]);
			}
		}		
	}

	return null;
};

const genEmbed = async (result: Results["0"], nsfw: boolean): Promise<LocalizableMessageEmbedOptions> => {
	if (ZAPISaucenaoPixiv.check(result.data)) {
		const pixiv_id = result.data.pixiv_id ?? null;
		if (pixiv_id !== null) {
			const embed = await genPixivEmbed(pixiv_id, nsfw);
			if (embed !== null) {
				return embed;
			}
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
					const pixiv_id = matches.filter(m => m)[1];

					if (pixiv_id) {
						const embed = await genPixivEmbed(pixiv_id, nsfw);
						if (embed !== null) {
							return embed;
						}
					}
				}

				// If fetching the original source fails, fallback
				return turn2thumbnail(genMoebooruEmbed(provider, imageObjects[0], true, nsfw));
			}
		}
	} else if (ZAPISaucenaoEHentai.check(result.data)) {
		// TODO: Fetch gallery info
		return {
			title: "E-Hentai",
			description: [result.data.jp_name, result.data.eng_name].join("\n"),
			footer: {
				text: result.data.creator.join(", ")
			}
		}
	} else if (ZAPISaucenaoTwitter.check(result.data)) {
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
			footer: {
				text: result.header.index_name
			}
		};
	}

	return {
		title: "Unknown sauce",
		description: JSON.stringify(result.data, null, 2),
		footer: {
			text: result.header.index_name
		}
	};
};

// Some sauces are juicier than others...
const PREFERENCE = [
	5, // Pixiv
	8, // Nico Nico Seiga
	41 // Twitter
];

const query = async (id: string, url: string, nsfw: boolean): Promise<LocalizableInteractionReplyOptions> => {
	const res = await req2json(`https://saucenao.com/search.php?api_key=${process.env.saucenao_key}&db=999&output_type=2&numres=10&url=${url}`) as APISaucenao;

	if (res.results === null) {
		return {
			content: {
				key: "sauce.noSauce"
			}
		};
	}

	const results = res.results.sort((r1, r2) => {
		// For high similarities, sort by preference
		if (parseFloat(r1.header.similarity) > 90 && parseFloat(r2.header.similarity) > 90) {
			let i1 = PREFERENCE.indexOf(r1.header.index_id);
			let i2 = PREFERENCE.indexOf(r2.header.index_id);
			
			if (i1 === -1) {
				i1 = PREFERENCE.length;
			}

			if (i2 === -1) {
				i2 = PREFERENCE.length;
			}

			if (i1 !== i2) {
				return i1 - i2;
			}
		}

		// Then sort by similarity
		return parseFloat(r2.header.similarity) - parseFloat(r1.header.similarity);
	});

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
										emoji: _similarity > 90 ? "🟢" : (_similarity > 60 ? "🟡" : "🔴"),
										label: `(${result.header.similarity}%) - ${result.header.index_name}`.substring(0, 90),
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
		error("sauce", e);
		return {
			content: {
				key: "sauce.noSauce"
			}
		};
	}
};

const interactionResults: Dictionary<Results> = {};

export const command: Command = {
	defer: true,
	name: "sauce",
	onMessageContextMenu: async (interaction) => {
		const message = interaction.getMessage();
		const nsfw = interaction.channel ? ("nsfw" in interaction.channel ? interaction.channel.nsfw : false) : false;

		// Attachment shows first, then embeds.
		const urls = findImagesFromMessage(message);
		let url;

		if (!urls.length) {
			return {
				content: {
					key: "sauce.invalidUrl"
				}
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
											emoji: _similarity > 90 ? "🟢" : (_similarity > 60 ? "🟡" : "🔴"),
											label: `(${result.header.similarity}%) - ${result.header.index_name}`.substring(0, 90),
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

		return {
			content: "UwU"
		};
	}
};
