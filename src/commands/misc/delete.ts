import { MessageContextMenuCommand } from "@class/ApplicationCommand";
import { LInteractionReplyOptions } from "@localizer/InteractionReplyOptions";

class Command extends MessageContextMenuCommand {
	public async onContextMenu(): Promise<LInteractionReplyOptions> {
		// This is only used to register the command, and the handler is in index.ts
		return {};
	}
}

export const _delete = new Command({
	name: "delete"
});