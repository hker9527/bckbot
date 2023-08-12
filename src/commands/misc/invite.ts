import { SlashApplicationCommand } from "@app/classes/ApplicationCommand";
import { LInteractionReplyOptions } from "@localizer/InteractionReplyOptions";
import { ChatInputCommandInteraction } from "discord.js";

class Command extends SlashApplicationCommand {
	public async onCommand(interaction: ChatInputCommandInteraction): Promise<LInteractionReplyOptions> {
		return {
			content: `<https://discordapp.com/oauth2/authorize?&client_id=${interaction.client.user.id}&scope=bot%20applications.commands&permissions=523328>`
		};
	}
}

export const invite = new Command({
	name: "invite"
});