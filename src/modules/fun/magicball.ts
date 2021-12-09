import { random, sleep } from "@app/utils";
import { SlashCommand } from "@type/SlashCommand";

const map = {
	"Good": "🟢",
	"Fair": "🟡",
	"Bad": "🔴"
};

export const module: SlashCommand = {
	name: "ask",
	description: "Magic 8 ball",
	options: [{
		name: "question",
		description: "The question to ask",
		type: "STRING",
	}],
	defer: true,
	onCommand: async () => {
		const result = random(0, 19);
		const type = result < 10 ? "Good" : (result < 14 ? "Fair" : "Bad");

		await sleep(1000);
		return {
			key: `${map[type]}\t$t(magicball.answer${result})`
		};
	}
};
