import { Command } from "@type/Command";

export const command: Command = {
	defer: false,
	name: "invite",
	onCommand: async (interaction) => {
		return {
			content: `<https://discordapp.com/oauth2/authorize?&client_id=${interaction.client.user!.id}&scope=bot%20applications.commands&permissions=523328>`
		};
	}
};
