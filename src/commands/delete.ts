import { Command } from "@type/Command";

export const command: Command = {
	defer: false,
	type: "MESSAGE",
	name: "delete",
	onContextMenu: async () => {
		// This is only used to register the command, and the handler is in index.ts
		return {};
	}
}