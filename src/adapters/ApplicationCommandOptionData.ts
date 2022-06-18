import { getName, getDescription } from "@app/Localizations";
import { Dictionary } from "@type/Dictionary";
import { BaseApplicationCommandOptionsData, ApplicationCommandOptionChoiceData, ApplicationCommandOptionData, ApplicationCommandNumericOptionData, ApplicationCommandSubCommandData } from "discord.js";

type LocalizableOption = Omit<BaseApplicationCommandOptionsData, "name" | "nameLocalizations" | "description" | "descriptionLocalizations">;

interface LocalizableOptionWithChoices extends LocalizableOption {
	choices?: Dictionary<ApplicationCommandOptionChoiceData["value"]>
}

interface LocalizableStringOption extends LocalizableOptionWithChoices {
	type: "STRING"
}

interface LocalizableNumberOption extends LocalizableOptionWithChoices {
	type: "NUMBER" | "INTEGER",
	min?: number,
	max?: number
}

interface LocalizableSubCommandOption extends Exclude<LocalizableOptionWithChoices, "required"> {
	type: "SUB_COMMAND",
	options?: Dictionary<Exclude<LocalizableApplicationCommandOptionData, LocalizableSubCommandOption>>
}

export type LocalizableApplicationCommandOptionData =
	| LocalizableStringOption
	| LocalizableNumberOption
	| LocalizableSubCommandOption;

export class LocalizableApplicationCommandOptionDataAdapter {
	private commandName: string;
	private name: string;
	private option: LocalizableApplicationCommandOptionData;

	public constructor(commandName: string, name: string, option: LocalizableApplicationCommandOptionData) {
		this.commandName = commandName;
		this.name = name;
		this.option = option;
	}

	public build(): ApplicationCommandOptionData {
		let _ret: Record<string, any> = {
			...getName(this.commandName, this.name),
			...getDescription(this.commandName, this.name),
			required: "required" in this.option ? this.option.required : undefined,
			type: this.option.type
		};

		if (this.option.choices) {
			_ret.choices = Object.entries(this.option.choices).map(([key, value]) => ({
				...getName(this.commandName, key),
				value
			}));
		}

		if ("options" in this.option && this.option.options) {
			_ret.options = Object.entries(this.option.options).map(([key, value]) => new LocalizableApplicationCommandOptionDataAdapter(this.commandName, key, value).build());
		}

		switch (this.option.type) {
			case "NUMBER":
			case "INTEGER":
				const ret = _ret as ApplicationCommandNumericOptionData;
				ret.min_value = this.option.min;
				ret.max_value = this.option.max;

				return ret;
			case "SUB_COMMAND":
				return _ret as ApplicationCommandSubCommandData;
			default:
				return _ret as ApplicationCommandOptionData;
		}
	}
}