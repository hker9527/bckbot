import { SlashCommand } from "@type/SlashCommand";

export const module: SlashCommand = {
	name: "ping",
	description: "Ping pong!",
	onCommand: async (interaction) => {
		return await interaction.reply("Pong!");
	}
};