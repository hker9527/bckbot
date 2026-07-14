import { UserContextMenuCommand } from "@class/ApplicationCommand";
import { t } from "@app/i18n/token";
import type { ImageURLOptions, InteractionReplyOptions, UserContextMenuCommandInteraction } from "discord.js";

const bestOptions: ImageURLOptions = {
	extension: "png",
	size: 4096
};

class Command extends UserContextMenuCommand {
	public async onContextMenu(interaction: UserContextMenuCommandInteraction): Promise<InteractionReplyOptions> {
		const user = await interaction.targetUser.fetch();
		const member = interaction.guild?.members.cache.get(user.id);

		const userAvatarURL = user.displayAvatarURL(bestOptions);
		const guildAvatarURL = member && "avatarURL" in member ? member.avatarURL(bestOptions) : null;
		const bannerURL = user.bannerURL(bestOptions);

		return {
			embeds: [{
				fields: [
					{
						name: t("avatar.user"),
						value: `<@${user.id}> (${user.id})`
					},
					{
						name: t("avatar.userAvatar"),
						value: t("avatar.link", {
							link: userAvatarURL
						})
					},
					{
						name: t("avatar.guildAvatar"),
						value: guildAvatarURL ? t("avatar.link", {
							link: guildAvatarURL
						}) : t("avatar.none")
					},
					{
						name: t("avatar.banner"),
						value: bannerURL ? t("avatar.link", {
							link: bannerURL
						}) : t("avatar.none")
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