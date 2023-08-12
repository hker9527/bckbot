import { SlashApplicationCommand } from "@app/classes/ApplicationCommand";
import { LInteractionReplyOptions } from "@localizer/InteractionReplyOptions";

class Command extends SlashApplicationCommand {
	public async onCommand(): Promise<LInteractionReplyOptions> {
		return {
			content: "uwu"
		};
	}
}

export const ping = new Command({
	name: "ping"
});