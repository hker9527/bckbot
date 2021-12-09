import { getString } from "@app/i18n";
import * as utils from '@app/utils';
import { Module, ModuleActionArgument } from '@type/Module';
import { SlashCommand } from "@type/SlashCommand";

export const module: SlashCommand = {
	name: "roll",
	description: "roll.description",
	options: [
		{
			name: "upper",
			description: "roll.upperDescription",
			type: "INTEGER",
			optional: true
		}, {
			name: "lower",
			description: "roll.lowerDescription",
			type: "INTEGER",
			optional: true
		}
	],
	onCommand: async (interaction) => {
		const lower = interaction.options.getInteger("lower") ?? 0;
		const upper = interaction.options.getInteger("upper") ?? (lower + 100);

		if (lower > upper) {
			return getString("roll.invalidRange", interaction.getLocale(), { lower, upper });
		}

		return getString("roll.roll", interaction.getLocale(), {
			points: utils.random(lower, upper)
		});
	}
};
