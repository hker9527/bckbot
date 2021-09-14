import { Languages } from "@app/i18n";
import { Dictionary } from "./Dictionary";

export type Database = {
	language: {
		guilds: Dictionary<Languages>,
		channels: Dictionary<Languages>;
	},
	osuLink: Dictionary<string>;
};