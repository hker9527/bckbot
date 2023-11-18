import { getName, getDescription } from "@app/Localizations";
import type { BaseApplicationCommandOptionsData, ApplicationCommandOptionChoiceData, ApplicationCommandOptionData, ApplicationCommandNumericOptionData, ApplicationCommandStringOptionData } from "discord.js";
import { ApplicationCommandOptionType } from "discord.js";
import { Custom } from "./custom";

type LocalizableOption = Omit<BaseApplicationCommandOptionsData, "nameLocalizations" | "description" | "descriptionLocalizations" | "autocomplete"> & {
	type: keyof typeof ApplicationCommandOptionType
};

type LApplicationCommandOptionChoiceData<Value extends string | number = string | number> = Omit<ApplicationCommandOptionChoiceData<Value>, "nameLocalizations">;

interface LApplicationCommandChoicesData<Type extends string | number = string | number> extends LocalizableOption {
	choices?: LApplicationCommandOptionChoiceData<Type>[]
}

interface LApplicationCommandStringOptionData extends LApplicationCommandChoicesData<string>, Pick<ApplicationCommandStringOptionData, "minLength" | "maxLength"> {
	type: "String";
}

interface LApplicationCommandNumericOptionData extends LApplicationCommandChoicesData<number>, Pick<ApplicationCommandNumericOptionData, "minValue" | "maxValue"> {
	type: "Number" | "Integer";
}

export type LApplicationCommandOptionData =
	| LApplicationCommandStringOptionData
	| LApplicationCommandNumericOptionData;

export class ApplicationCommandOption extends Custom<ApplicationCommandOptionData> {
	private commandName: string;
	private option: LApplicationCommandOptionData;

	public constructor(commandName: string, option: LApplicationCommandOptionData) {
		super();
		
		this.commandName = commandName;
		this.option = option;
	}

	public toAPI(): ApplicationCommandOptionData {
		let _ret: BaseApplicationCommandOptionsData & {
			type: ApplicationCommandOptionType
		} = {
			...getName(this.commandName, this.option.name),
			...getDescription(this.commandName, this.option.name),
			required: "required" in this.option ? this.option.required : undefined,
			type: ApplicationCommandOptionType[this.option.type]
		};

		let choices: ApplicationCommandOptionChoiceData<string | number>[] | undefined;
		let options: any;

		if (this.option.choices) {
			choices = this.option.choices.map(choice => ({
				...getName(this.commandName, choice.name),
				value: choice.value
			}));
		}

		// if ("options" in this.option && this.option.options) {
		// 	options = Object.entries(this.option.options).map(([key, value]) => 
		// 		new ApplicationCommandOption(this.commandName, key, value).toAPI()
		// 	);
		// }

		switch (this.option.type) {
			case "Number":
			case "Integer":
				return {
					..._ret,
					choices,
					options
				} as ApplicationCommandNumericOptionData;
			case "String":
				return {
					..._ret,
					choices,
					options
				} as ApplicationCommandStringOptionData;
		}
	}
}