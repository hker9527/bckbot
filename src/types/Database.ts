import { Languages } from "@app/i18n";
import { arr2obj, enumStringKeys } from "@app/utils";
import { Dictionary } from "./Dictionary";

export enum Currencies {
	"TWD", "HKD", "JPY", "USD", "EUR"
};

export type Database = {
	language: {
		guilds: Dictionary<Languages>,
		channels: Dictionary<Languages>;
	},
	osuLink: Dictionary<string>,
	currency: {
		data: Record<keyof typeof Currencies, Record<keyof typeof Currencies, number>>,
		lastUpdate: Date
	}
};