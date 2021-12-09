import { APIMessageComponentAdapter } from "@app/Adapters";
import { SlashCommand } from "@type/SlashCommand";
import { InteractionReplyOptions } from "discord.js";

export const module: SlashCommand = {
	name: "invite",
	description: "Get the invite link of this bot.",
	onCommand: async (interaction) => {
		return `<https://discordapp.com/oauth2/authorize?&client_id=${interaction.client.user!.id}&scope=bot%20applications.commands&permissions=523328>`;
	}
};
