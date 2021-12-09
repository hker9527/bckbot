import { random } from "@app/utils";
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
			return {
				key: "roll.invalidRange",
				data: { lower, upper }
			};
		}

		return {
			key: "roll.roll",
			data: {
				points: random(lower, upper)
			}
		};
	}
};
