import { Command } from "@type/Command";
import { ImageURLOptions } from "discord.js";

const bestOptions: ImageURLOptions = {
	format: "png",
	dynamic: true,
	size: 4096
};

export const command: Command = {
	defer: false,
	name: "avatar",
	onUserContextMenu: async (interaction) => {
		const user = await interaction.getUser().fetch(true);
		const member = interaction.guild?.members.cache.get(user.id);

		const userAvatarURL = user.displayAvatarURL(bestOptions);
		const guildAvatarURL = member && "avatarURL" in member ? member.avatarURL(bestOptions) : null;
		const bannerURL = user.bannerURL(bestOptions);

		return {
			embeds: [{
				fields: [
					{
						name: {
							key: "avatar.user"
						},
						value: `<@${user.id}> (${user.id})`
					},
					{
						name: {
							key: "avatar.userAvatar"
						},
						value: {
							key: "avatar.link",
							data: {
								link: userAvatarURL
							}
						}
					},
					{
						name: {
							key: "avatar.guildAvatar"
						},
						value: guildAvatarURL ? {
							key: "avatar.link",
							data: {
								link: guildAvatarURL
							}
						} : {
							key: "avatar.none"
						}
					},
					{
						name: {
							key: "avatar.banner"
						},
						value: bannerURL ? {
							key: "avatar.link",
							data: {
								link: bannerURL
							}
						} : {
							key: "avatar.none"
						}
					}
				],
				author: {
					name: `${user.username}`
				},
				color: 0x8dd272,
				image: userAvatarURL,
				url: "https://discord.com"
			},
			{
				image: guildAvatarURL || "",
				url: "https://discord.com"
			},
			{
				image: bannerURL || "",
				url: "https://discord.com"
			}].filter((embed) => embed.image !== ""),
			ephemeral: true
		};
	}
};
