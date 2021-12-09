import { getString } from "@app/i18n";
import * as utils from "@app/utils";
import { SlashCommand } from "@type/SlashCommand";

export const module: SlashCommand = {
	name: "dice",
	description: "dice.description",
	options: [
		{
			name: "n",
			description: "dice.nDescription",
			type: "INTEGER",
			min_value: 1,
			max_value: 1000
		}, {
			name: "faces",
			description: "dice.facesDescription",
			type: "INTEGER",
			min_value: 1,
			max_value: 0x198964
		}, {
			name: "offset",
			description: "dice.offsetDescription",
			descriptionRaw: true,
			type: "INTEGER",
			optional: true
		}
	],
	onCommand: async (interaction) => {
		const n = interaction.options.getInteger("n", true);
		const faces = interaction.options.getInteger("faces", true);
		const offset = interaction.options.getInteger("offset") ?? 0;

		let result = 0;
		for (let i = 0; i < n; i++) {
			result += utils.random(1, faces);
		}
		result += offset;
		return {
			key: "dice.roll",
			data: { faces, n, offset: `${offset > 0 ? "+" : (offset < 0 ? "-" : "")}${offset == 0 ? "" : offset}`, result }
		};
	}
};
