import { Client } from "discord.js";
import Vorpal from "vorpal";
import osu from "osu.ts";
import { Database } from "sqlite";

export const Singleton: {
	logger?: Vorpal,
	client?: Client,
	osuClient?: osu,
	db?: Database
} = {};