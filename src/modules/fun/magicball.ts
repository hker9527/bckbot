import { random, sleep } from "@app/utils";
import { SlashCommand } from "@type/SlashCommand";

const map = {
	Good: "28a745",
	Fair: "ffc107",
	Bad: "dc3545"
};

export const module: SlashCommand = {
	name: "ask",
	description: "Magic 8 ball",
	options: [{
		name: "question",
		description: "The question to ask",
		type: "STRING"
	}],
	defer: true,
	onCommand: async (interaction) => {
		const result = random(0, 19);
		const type = result < 10 ? "Good" : (result < 15 ? "Fair" : "Bad");

		await sleep(1000);
		return {
			embeds: [{
				color: `#${map[type]}`,
				footer: {
					text: {
						key: `🤔\t$t(magicball.answer${result})`
					}
				},
				author: {
					name: `${interaction.options.getString("question", true)}`
				}
			}]
		};
	}
};
