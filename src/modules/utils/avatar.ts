import { getString } from "@app/i18n";
import { ContextMenuCommand } from "@type/SlashCommand";
import { MessageEmbed } from 'discord.js';

export const module: ContextMenuCommand = {
	name: "avatar",
	description: "",
	type: "USER",
	onContextMenu: async (interaction) => {
		const user = interaction.getUser();

		const avatarURL = user.avatarURL({
			format: "png",
			dynamic: true,
			size: 4096
		});

		if (!avatarURL) {
			return await interaction.reply({ content: getString("avatar.avatarNotFound", interaction.getLocale()), ephemeral: true });
		}

		const embed = new MessageEmbed()
			.setDescription(`[URL](${avatarURL})`)
			.setAuthor(`${user.username}'s avatar`)
			.setColor("#8dd272");

		embed.setImage(avatarURL);

		return await interaction.reply({ embeds: [embed], ephemeral: true });
	}
};
