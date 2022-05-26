import { arr2obj, random, urandom } from "@app/utils";
import { Command } from "@type/Command";
import emoji from "node-emoji";

export const command: Command = {
	defer: false,
	name: "slap",
	options: {
		victim: {
			type: "STRING",
			required: true
		},
		tool: {
			type: "STRING"
		}
	},
	onCommand: async (interaction) => {
		return {
			content: {
				key: "slap.slap",
				data: {
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
								random(600, 1000)
							],
							[0.1, 0.6, 0.2, 0.1]
						)
					)
				}
			}
		}
	}
};
