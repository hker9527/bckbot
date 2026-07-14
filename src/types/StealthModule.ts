import type { BaseMessageOptions, Message } from "discord.js"

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
		result: BaseMessageOptions
	}>,
	onTimeout?: (message: Message) => Promise<BaseMessageOptions>
};