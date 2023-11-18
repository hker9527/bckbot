import type { LBaseMessageOptions } from "@localizer/MessageOptions"
import type { Message } from "discord.js"

export interface StealthModuleActionArgument {
	message: Message,
	matches?: RegExpMatchArray
};

export interface StealthModule {
	name: string,
	event: "messageCreate" | "messageDelete" | "messageUpdate",
	pattern?: RegExp,
	action: (obj: StealthModuleActionArgument) => Promise<boolean | {
		type: "reply" | "send",
		result: LBaseMessageOptions
	}>,
	onTimeout?: (message: Message) => Promise<LBaseMessageOptions>
};