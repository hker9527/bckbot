import { Command } from "@type/Command";

export const command: Command = {
	defer: false,
	type: "MESSAGE",
	name: "delete",
	onContextMenu: async (interaction) => {
		const sourceMessage = interaction.getMessage();

		// Check if the interaction issuer is the message author or is an admin
		const guildUser = (await interaction.guild?.members.fetch(interaction.user))!;

		if (sourceMessage.author.id !== interaction.client.user!.id) {
			return {
				content: {
					key: "delete.notMyMessage"	
				},
				ephemeral: true
			};
		}

		if (
			sourceMessage.mentions.repliedUser?.id === interaction.user.id
			|| sourceMessage.interaction && sourceMessage.interaction.user.id === interaction.user.id
			|| guildUser.permissions.has("ADMINISTRATOR")
		) {
			await sourceMessage.delete();
			return {
				content: {
					key: "delete.deleted"
				},
				ephemeral: true
			};
		} else {
			return {
				content: {
					key: "delete.deletingOthersMessage"
				},
				ephemeral: true
			};
		}
	}
}