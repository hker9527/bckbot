import { Command } from "@type/Command";

export const command: Command = {
	defer: false,
	name: "delete",
	onMessageContextMenu: async () => {
		// This is only used to register the command, and the handler is in index.ts
		return {};
	}
}