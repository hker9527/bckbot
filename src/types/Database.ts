import { Languages } from "@app/i18n";
import { Dictionary } from "./Dictionary";

export enum Currencies {
	TWD, HKD, JPY, USD, EUR
}

export interface Database {
	language: {
		guilds: Dictionary<Languages>,
		channels: Dictionary<Languages>;
	},
	osuLink: Dictionary<string>,
	currency: {
		data: Record<keyof typeof Currencies, Record<keyof typeof Currencies, number>>,
		lastUpdate: Date
	}
}