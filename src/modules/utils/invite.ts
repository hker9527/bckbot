import { SlashCommand } from "@type/SlashCommand";

export const module: SlashCommand = {
	name: "invite",
	description: "Get the invite link of this bot.",
	onCommand: async (interaction) => {
		return await interaction.reply(`<https://discordapp.com/oauth2/authorize?&client_id=${interaction.client.user!.id}&scope=bot&permissions=523328>`);
	}
};
