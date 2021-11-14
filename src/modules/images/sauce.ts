import { req2json } from "@app/utils";
import { SaucenaoApiResponse } from "@type/api/Saucenao";
import { ContextMenuCommand } from "@type/SlashCommand";
import { Message, MessageEmbed } from "discord.js";
import { ApiPortal, fetchList, genEmbed as genMoebooruEmbed } from "./picsearch";
import { genEmbed as genPixivEmbed } from "./pixiv";
export const module: ContextMenuCommand = {
	name: "sauce",
	description: "",
	type: "MESSAGE",
	onContextMenu: async (interaction) => {
		await interaction.deferReply();

		const message = interaction.getMessage();
		const nsfw = interaction.channel ? ("nsfw" in interaction.channel ? interaction.channel.nsfw : false) : false;
		
		// Attachment shows first, then embeds.
		const url = message.attachments.first()?.url ?? message.embeds.filter(embed => embed.thumbnail || embed.image)[0]?.url;

		if (!url) {
			return await interaction.editReply("No usable image found!");
		}

		const res = await req2json(`https://saucenao.com/search.php?api_key=${process.env.saucenao_key}&db=999&output_type=2&numres=10&url=${url}`) as SaucenaoApiResponse;

		if (res.header.status === 0) {
			if (res.results === null) {
				return await interaction.editReply("No sauce found!");
			}

			// TODO: Select dropdown for user to check other sauces
			const results = res.results.sort((r1, r2) => parseFloat(r1.header.similarity) < parseFloat(r2.header.similarity) ? 1 : -1);
			try {
				for (const result of results) {
					const similarity = parseFloat(result.header.similarity);

					let embed: MessageEmbed | null = null;
					if ("pixiv_id" in result.data) { // TODO: Check if Moebooru's source is pixiv
						const _embed = await genPixivEmbed(`${result.data.pixiv_id}`, false);
						if (_embed === null) {
							return await interaction.editReply("The related post is not found!");
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
						return await interaction.editReply({
							content: (similarity < 70 ? "||" : "") + `Confidence level: ${similarity}%` + (similarity < 70 ? " ||" : ""),
							embeds: [embed]
						});
					}
				}
				throw "Unknown";
			} catch (e) {
				// No suitable sauce found.... Default to the highest confidence one.
				// TODO: Beautify

				return await interaction.editReply("The sauce in unfamiliar to me... Here are some of the ingredients.\n```json\n" + JSON.stringify(results[0], null, 4) + "```");
			}
		} else {
			return await interaction.editReply(`Error: ${res.header.message}`);
		}
	}
};
