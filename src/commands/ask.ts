import { random, sleep } from "@app/utils";
import { Command } from "@type/Command";

const map = {
	Good: "28a745",
	Fair: "ffc107",
	Bad: "dc3545"
};

export const command: Command = {
	defer: true,
	name: "ask",
	options: {
		"question": {
			type: "STRING",
			required: true
		}
	},
	onCommand: async (interaction) => {
		const result = random(0, 19);
		const type = result < 10 ? "Good" : (result < 15 ? "Fair" : "Bad");

		await sleep(random(1000, 3000));

		return {
			embeds: [{
				color: `#${map[type]}`,
				footer: {
					text: {
						key: `🤔\t$t(ask.answer${result})`
					}
				},
				author: {
					name: `${interaction.options.getString("question", true)}`
				}
			}]
		};
	}
};
