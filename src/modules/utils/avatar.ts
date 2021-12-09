import { getString } from "@app/i18n";
import { ContextMenuCommand } from "@type/SlashCommand";
import { MessageEmbed } from 'discord.js';

export const module: ContextMenuCommand = {
	name: "avatar.name",
	type: "USER",
	onContextMenu: async (interaction) => {
		const user = interaction.getUser();

		const avatarURL = user.avatarURL({
			format: "png",
			dynamic: true,
			size: 4096
		});

		if (!avatarURL) {
			return { content: getString("avatar.avatarNotFound", interaction.getLocale()), ephemeral: true };
		}

		const embed = new MessageEmbed()
			.setDescription(`[URL](${avatarURL})`)
			.setAuthor(`${user.username}'s avatar`)
			.setColor("#8dd272");

		embed.setImage(avatarURL);

		return { embeds: [embed], ephemeral: true };
	}
};
