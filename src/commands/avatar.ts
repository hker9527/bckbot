import { Command } from "@type/Command";

export const command: Command = {
	defer: false,
	type: "USER",
	name: "avatar",
	onContextMenu: async (interaction) => {
		const user = interaction.getUser();

		const avatarURL = user.avatarURL({
			format: "png",
			dynamic: true,
			size: 4096
		});

		if (!avatarURL) {
			return {
				content: {
					key: "avatar.avatarNotFound"
				},
				ephemeral: true
			};
		}

		return {
			embeds: [{
				description: `[URL](${avatarURL})`,
				author: {
					name: `${user.username}'s avatar`
				},
				color: "#8dd272",
				image: avatarURL
			}],
			ephemeral: true
		};
	}
};
