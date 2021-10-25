import { Singleton } from '@app/Singleton';
import { ArgumentRequirement, Module, ModuleActionArgument } from '@app/types/Module';
import { SaucenaoApiResponse } from '@app/types/SaucenaoApiResponse';
import * as utils from '@app/utils';
import * as picsearch from '@module/images/picsearch';
import * as pixiv from '@module/images/pixiv';
import { Collection, Message, MessageEmbed, TextChannel } from 'discord.js';

enum Source {
	HMagazines = 0,
	HGame_CG = 2,
	DoujinshiDB = 3,
	Pixiv_Images = 5,
	Pixiv_Historical = 6,
	Nico_Nico_Seiga = 8,
	Danbooru = 9,
	Drawr_Images = 10,
	Nijie_Images = 11,
	Yandere = 12,
	FAKKU = 16,
	Nhentai = 18,
	TwoDMarket = 19,
	MediBang = 20,
	Anime = 21,
	HAnime = 22,
	Movies = 23,
	Shows = 24,
	Gelbooru = 25,
	Konachan = 26,
	SankakuChannel = 27,
	AnimePicturesnet = 28,
	E621net = 29,
	IdolComplex = 30,
	Bcynet_Illust = 31,
	Bcynet_Cosplay = 32,
	PortalGraphicsnet = 33,
	DeviantArt = 34,
	Pawoonet = 35,
	Madokami = 36,
	MangaDex = 37,
	HMisc_EHentai = 38,
	Artstation = 39,
	FurAffinity = 40,
	Twitter = 41,
	Furry_Network = 42
};

export const findImageFromMessages = (index: number, msgs: Collection<string, Message>) => {
	let i = 0;
	let url = "";

	for (const [_, msg] of msgs.filter(a => a.author.id !== Singleton.client.user!.id)) {
		for (const embed of msg.embeds.reverse()) {
			if (i === index) {
				if (embed.thumbnail) {
					url = embed.thumbnail.url;
					break;
				} else if (embed.image) {
					url = embed.image.url;
					break;
				}
			} else {
				i++;
			}
		}

		if (url.length) return url;

		for (const [_, attachment] of msg.attachments) {
			if (attachment.width && attachment.width > 0) {
				if (i === index) {
					url = attachment.url;
					break;
				} else {
					i++;
				}
			}
		}

		if (url.length) return url;
	}

	return null;
};
export const module: Module = {
	trigger: ["sauce"],
	event: "messageCreate",
	argv: {
		"index": [ArgumentRequirement.Optional]
	},
	action: async (obj: ModuleActionArgument) => {
		let index = 0;

		if (obj.argv!.index) {
			const _index = Math.abs(parseInt(obj.argv!.index));
			if (_index.inRange(0, 100)) index = Math.abs(_index);
		}

		const nsfw = (obj.message.channel as TextChannel).nsfw;
		const messages = await obj.message.channel.messages.fetch({ limit: 100 });

		const url = findImageFromMessages(index, messages);
		if (url === null) {
			return obj.message.reply("No valid image in history!");
		}

		const msg = await obj.message.channel.send("Querying image `" + url + "`...");
		const res = await utils.req2json(`https://saucenao.com/search.php?api_key=${process.env.saucenao_key}&db=999&output_type=2&numres=1&url=${url}`) as SaucenaoApiResponse;

		if (res.header.status === 0) {
			if (res.results === null) {
				return await msg.edit("No sauce found!");
			}

			const result = res.results[0];
			const similarity = parseFloat(result.header.similarity);

			let embed: MessageEmbed;
			try {
				const parentId = res.header.index[result.header.index_id].parent_id;
				if (parentId == Source.Pixiv_Images) {
					const _embed = await pixiv.genEmbed(`${result.data.pixiv_id!}`, false);
					if (_embed === null) {
						return await msg.edit("The related post is not found!");
					}
					embed = _embed;
				} else {
					let provider: keyof typeof picsearch.ApiPortal | null = null;
					let id: number | null = null;

					if (parentId == Source.Yandere) {
						provider = "yan";
						id = result.data.yandere_id!;
					} else if (parentId == Source.Konachan) {
						provider = "kon";
						id = result.data.konachan_id!;
					} else if (parentId == Source.Danbooru) {
						provider = "dan";
						id = (result.data.danbooru_id ?? result.data.gelbooru_id)!;
					}

					if (provider !== null && id !== null) {
						const imageObjects = await picsearch.fetchList(provider, [`id:${id}`], nsfw);
						if (imageObjects.length === 0) {
							return await msg.edit("The related post is not found!");
						}
						embed = await picsearch.genEmbed(provider, imageObjects[0], false, nsfw);
					} else {
						return await msg.edit(JSON.stringify(result));
					}
				}
				return msg.edit({
					content: (similarity < 70 ? "||" : "") + `Confidence level: ${similarity}%` + (similarity < 70 ? " ||" : ""),
					embeds: [embed]
				});
			} catch (e) {
				return await msg.edit(JSON.stringify(result));
			}
		} else {
			return await msg.edit(`Error: ${res.header.message}`);
		}
	}
};
