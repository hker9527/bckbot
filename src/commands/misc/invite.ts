import { SlashApplicationCommand } from "@app/classes/ApplicationCommand";
import type { InteractionReplyOptions } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";

class Command extends SlashApplicationCommand {
	public async onCommand(interaction: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
		return {
			content: `<https://discordapp.com/oauth2/authorize?&client_id=${interaction.client.user.id}&scope=bot%20applications.commands&permissions=523328>`
		};
	}
}

export const invite = new Command({
	name: "invite"
});