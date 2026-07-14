import { MessageContextMenuCommand } from "@class/ApplicationCommand";
import type { InteractionReplyOptions } from "discord.js";

class Command extends MessageContextMenuCommand {
	public async onContextMenu(): Promise<InteractionReplyOptions> {
		// This is only used to register the command, and the handler is in index.ts
		return {};
	}
}

export const _delete = new Command({
	name: "delete"
});