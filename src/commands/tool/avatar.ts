import { UserContextMenuCommand } from "@class/ApplicationCommand";
import { LInteractionReplyOptions } from "@localizer/InteractionReplyOptions";
import { ImageURLOptions, UserContextMenuCommandInteraction } from "discord.js";

const bestOptions: ImageURLOptions = {
	extension: "png",
	size: 4096
};

class Command extends UserContextMenuCommand {
	public async onContextMenu(interaction: UserContextMenuCommandInteraction): Promise<LInteractionReplyOptions> {
		const user = await interaction.targetUser.fetch();
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
				image: {
					url: userAvatarURL
				},
				url: "https://discord.com"
			},
			{
				image: {
					url: guildAvatarURL || ""
				},
				url: "https://discord.com"
			},
			{
				image: {
					url: bannerURL || ""
				},
				url: "https://discord.com"
			}].filter((embed) => embed.image.url !== ""),
			ephemeral: true
		};
	}
}

export const avatar = new Command({
	name: "avatar"
});