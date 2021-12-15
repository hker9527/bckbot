import { Localizable } from "@localizer/Data";
import { Message } from "discord.js";
import { Dictionary } from "../Dictionary";
import { StealthModuleResultType } from "./result";

export type StealthModuleActionArgument = {
	message: Message,
	eval?: Dictionary<any>,
	matches?: RegExpMatchArray
}

export type StealthModule = {
	eval?: Dictionary<string>,
	event: "messageCreate" | "messageDelete" | "messageUpdate",
	pattern?: RegExp,
	action: (obj: StealthModuleActionArgument) => Promise<boolean | {
		type: "reply" | "send",
		result: Localizable | StealthModuleResultType
	}>, // TODO: Return object
	init?: (obj?: Dictionary<any>) => Promise<boolean>,
	interval?: {
		f: (obj?: Dictionary<any>) => Promise<boolean>,
		t: number
	}
}