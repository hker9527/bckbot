import { random } from "@app/utils";
import { Command } from "@type/Command";

export const command: Command = {
	defer: false,
	name: "dice",
	options: {
		n: {
			type: "INTEGER",
			required: true,
			min: 1,
			max: 1000
		},
		faces: {
			type: "INTEGER",
			required: true,
			min: 1,
			max: 0x198964
		},
		offset: {
			type: "INTEGER"
		}
	},
	onCommand: async (interaction) => {
		const n = interaction.options.getInteger("n", true);
		const faces = interaction.options.getInteger("faces", true);
		const offset = interaction.options.getInteger("offset") ?? 0;

		let result = 0;
		for (let i = 0; i < n; i++) {
			result += random(1, faces);
		}
		result += offset;

		return {
			content: {
				key: "dice.roll",
				data: { faces, n, offset: `${offset > 0 ? "+" : (offset < 0 ? "-" : "")}${offset === 0 ? "" : offset}`, result }
			}
		};
	}
};
