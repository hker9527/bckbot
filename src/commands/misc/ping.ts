import { SlashApplicationCommand } from "@app/classes/ApplicationCommand";
import type { InteractionReplyOptions } from "discord.js";

class Command extends SlashApplicationCommand {
	public async onCommand(): Promise<InteractionReplyOptions> {
		return {
			content: "uwu"
		};
	}
}

export const ping = new Command({
	name: "ping"
});