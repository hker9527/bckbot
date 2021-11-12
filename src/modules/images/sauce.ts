import { Singleton } from '@app/Singleton';
import { ArgumentRequirement, Module, ModuleActionArgument } from '@type/Module';
import { SaucenaoApiResponse } from '@type/api/Saucenao';
import * as utils from '@app/utils';
import * as picsearch from '@module/images/picsearch';
import * as pixiv from '@module/images/pixiv';
import { Collection, Message, MessageEmbed, TextChannel } from 'discord.js';

export const findImageFromMessages = (index: number, msgs: Collection<string, Message>) => {
	// Precedence: URL > Embeds > Attachments

	let i = 0;
	let url: string | null = null;

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

		if (url) return url;

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

		if (url) return url;
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
		const res = await utils.req2json(`https://saucenao.com/search.php?api_key=${process.env.saucenao_key}&db=999&output_type=2&numres=10&url=${url}`) as SaucenaoApiResponse;

		if (res.header.status === 0) {
			if (res.results === null) {
				return await msg.edit("No sauce found!");
			}

			// TODO: Select dropdown for user to check other sauces
			const results = res.results.sort((r1, r2) => parseFloat(r1.header.similarity) < parseFloat(r2.header.similarity) ? 1 : -1);
			try {
				for (const result of results) {
					const similarity = parseFloat(result.header.similarity);

					let embed: MessageEmbed | null = null;
					if ("pixiv_id" in result.data) { // TODO: Check if Moebooru's source is pixiv
						const _embed = await pixiv.genEmbed(`${result.data.pixiv_id}`, false);
						if (_embed === null) {
							return await msg.edit("The related post is not found!");
						}
						embed = _embed;
					} else if ("creator" in result.data) { // MoebooruData
						let provider: keyof typeof picsearch.ApiPortal | null = null;
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
							const imageObjects = await picsearch.fetchList(provider, [`id:${id}`], nsfw);
							if (imageObjects.length > 0) {
								embed = await picsearch.genEmbed(provider, imageObjects[0], false, nsfw);
							}
						}
					}
					if (embed) {
						return await msg.edit({
							content: (similarity < 70 ? "||" : "") + `Confidence level: ${similarity}%` + (similarity < 70 ? " ||" : ""),
							embeds: [embed]
						});
					}
				}
				throw "Unknown";
			} catch (e) {
				// No suitable sauce found.... Default to the highest confidence one.
				// TODO: Beautify

				return await msg.edit("The sauce in unfamiliar to me... Here are some of the ingredients.\n```json\n" + JSON.stringify(results[0], null, 4) + "```");
			}
		} else {
			return await msg.edit(`Error: ${res.header.message}`);
		}
	}
};
