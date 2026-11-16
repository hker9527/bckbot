import type { BaseMessageOptions, ButtonInteraction, Message } from "discord.js"

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
	onTimeout?: (message: Message) => Promise<BaseMessageOptions>,
	// Handles buttons whose customId starts with `${name}:`. Shared messages are
	// never changed: a click on one gets a private copy built from the returned
	// options, and clicks on that copy update it in place. False means no result.
	onButton?: (interaction: ButtonInteraction) => Promise<BaseMessageOptions | false>
};
