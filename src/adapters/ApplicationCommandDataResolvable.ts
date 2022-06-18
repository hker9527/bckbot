import { getName, getDescription } from "@app/Localizations";
import { Command } from "@type/Command";
import { ApplicationCommandDataResolvable } from "discord.js";
import { ApplicationCommandTypes } from "discord.js/typings/enums";
import { LocalizableApplicationCommandOptionData, LocalizableApplicationCommandOptionDataAdapter } from "./ApplicationCommandOptionData";

export class ApplicationCommandDataResolvableAdapter {
	private data: Command;

	public constructor(data: Command) {
		this.data = data;
	}

	public build(): ApplicationCommandDataResolvable {
		if ("onCommand" in this.data) {
			return {
				...getName(this.data.name),
				...getDescription(this.data.name),
				options: Object.entries(this.data.options ?? {}).map((arr: [string, LocalizableApplicationCommandOptionData]) => new LocalizableApplicationCommandOptionDataAdapter(this.data.name, arr[0], arr[1]).build())
			};
		} else {
			return {
				type: this.data.type === "USER" ? ApplicationCommandTypes.USER : ApplicationCommandTypes.MESSAGE,
				...getName(this.data.name)
			}
		}
	}
}