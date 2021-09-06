import { Channel } from "discord.js";
import { Dictionary } from "./Dictionary";

export type Guild = Dictionary<
	Dictionary<Channel>
>;