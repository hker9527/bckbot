import { getString } from "@app/i18n";
import { enumStringKeys, random, randomArrayElement, sleep } from "@app/utils";
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
	onCommand: async (interaction) => {
		const result = random(0, 19);
		const type = result < 10 ? "Good" : (result < 14 ? "Fair" : "Bad");

		await sleep(1000);
		return `${map[type]}\t${getString(`magicball.answer${result}`, interaction.getLocale())}`;
	}
};
