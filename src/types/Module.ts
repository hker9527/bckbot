import { Message } from "discord.js";
import { Dictionary } from "./Dictionary";

export type ModuleActionArgument = {
	message: Message,
	trigger: string,
	argv?: Dictionary<string>,
	eval?: Dictionary<any>
}

export enum ArgumentRequirement {
	Optional,
	Required,
	Concat
}

export type Module = {
	trigger: string[],
	argv?: Dictionary<ArgumentRequirement[]>,
	eval?: Dictionary<string>,
	event: "messageCreate" | "messageDelete" | "messageUpdate",
	action: (obj: ModuleActionArgument) => Promise<Message | boolean>, // TODO: Unify return value
	init?: (obj?: Dictionary<any>) => Promise<boolean>,
	interval?: {
		f: (obj?: Dictionary<any>) => Promise<boolean>,
		t: number
	}
}