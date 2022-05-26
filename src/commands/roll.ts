import { random } from "@app/utils";
import { Command } from "@type/Command";
import { Localizable } from "@type/Localizable";

export const command: Command = {
	defer: false,
	name: "roll",
	options: {
		"upper": {
			type: "INTEGER"
		},
		"lower": {
			type: "INTEGER"
		}
	},
	onCommand: async (interaction) => {
		const lower = interaction.options.getInteger("lower") ?? 0;
		const upper = interaction.options.getInteger("upper") ?? (lower + 100);

		if (lower > upper) {
			return {
				content: {
					key: "roll.invalidRange",
					data: { lower, upper }
				} as Localizable
			};
		}

		return {
			content: {
				key: "roll.roll",
				data: {
					points: random(lower, upper)
				}
			} as Localizable
		};
	}
};
