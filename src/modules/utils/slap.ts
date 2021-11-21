import { getString } from "@app/i18n";
import * as utils from '@app/utils';
import { SlashCommand } from "@type/SlashCommand";
import emoji from 'node-emoji';

export const module: SlashCommand = {
	name: "slap",
	description: "slap.description",
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
		return await interaction.reply(
			getString("slap.slap", interaction.getLocale(), {
				slapper: interaction.member!.toString(),
				victim: interaction.options.getString("victim", true),
				// TODO: Fix emoji that cannot display (message.react?)
				tool: (interaction.options.getString("tool") ?? emoji.random().emoji),
				damage: utils.urandom(
					utils.arr2obj(
						[
							utils.random(50, 100),
							utils.random(100, 300),
							utils.random(300, 600),
							utils.random(600, 1000),
						],
						[0.1, 0.6, 0.2, 0.1]
					)
				)
			})
		);
	},
};
