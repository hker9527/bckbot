import { getString } from "@app/i18n";
import { arr2obj, random, urandom } from "@app/utils";
import { SlashCommand } from "@type/SlashCommand";
import emoji from "node-emoji";

export const module: SlashCommand = {
	name: "slap",
	description: {
		key: "slap.description"
	},
	options: [
		{
			name: "victim",
			description: "slap.victimDescription",
			type: "STRING"
		}, {
			name: "tool",
			description: "slap.toolDescription",
			type: "STRING",
			optional: true
		}
	],
	onCommand: async (interaction) => {
		return getString("slap.slap", interaction.getLocale(), {
			slapper: interaction.member!.toString(),
			victim: interaction.options.getString("victim", true),
			// TODO: Fix emoji that cannot display (message.react?)
			tool: (interaction.options.getString("tool") ?? emoji.random().emoji),
			damage: urandom(
				arr2obj(
					[
						random(50, 100),
						random(100, 300),
						random(300, 600),
						random(600, 1000),
					],
					[0.1, 0.6, 0.2, 0.1]
				)
			)
		});
	},
};
