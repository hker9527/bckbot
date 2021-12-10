import { Message } from "discord.js";
import { Dictionary } from "./Dictionary";

export type StealthModuleActionArgument = {
	message: Message,
	argv?: Dictionary<string>,
	eval?: Dictionary<any>
}

export enum ArgumentRequirement {
	Optional,
	Required,
	Concat
}

export type StealthModule = {
	trigger: string[],
	argv?: Dictionary<ArgumentRequirement[]>,
	eval?: Dictionary<string>,
	event: "messageCreate" | "messageDelete" | "messageUpdate",
	action: (obj: StealthModuleActionArgument) => Promise<Message | boolean>, // TODO: Unify return value
	init?: (obj?: Dictionary<any>) => Promise<boolean>,
	interval?: {
		f: (obj?: Dictionary<any>) => Promise<boolean>,
		t: number
	}
}