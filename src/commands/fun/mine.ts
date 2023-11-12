import { random } from "@app/utils";
import { SlashApplicationCommand } from "@class/ApplicationCommand";
import { LApplicationCommandOptionData } from "@class/ApplicationCommandOptionData";
import { LInteractionReplyOptions } from "@localizer/InteractionReplyOptions";
import { ChatInputCommandInteraction } from "discord.js";
import { sample } from "underscore";

const numberSymbols = "　１２３４５６７８９".split("");
const bombSymbol = "Ｘ";

class Command extends SlashApplicationCommand {
	public options: LApplicationCommandOptionData[] = [
		{
			name: "h",
			type: "Integer",
			minValue: 3,
			maxValue: 14
		},
		{
			name: "w",
			type: "Integer",
			minValue: 3,
			maxValue: 14
		},
		{
			name: "n",
			type: "Integer",
			minValue: 1,
			maxValue: 191
		}
	];

	public async onCommand(interaction: ChatInputCommandInteraction): Promise<LInteractionReplyOptions> {
		const _h = random(3, 15);
		const _w = random(3, 15);

		let h = interaction.options.getInteger("h") ?? _h;
		let w = interaction.options.getInteger("w") ?? _w;
		let mineCount = interaction.options.getInteger("n") ?? Math.max(1, h * w / random(5, 10) | 0);

		if (mineCount > (h * w - 5)) mineCount = Math.max(1, h * w / random(5, 10) | 0);

		const field = [...new Array(h)].map(() => [...new Array(w)].map(() => numberSymbols[0]));

		const mineLocations = [];

		// 4 corners are always safe
		let avail = [...new Array(h * w)].map((a, i) => i).filter(a => [0, w - 1, w * (h - 1), w * h - 1].indexOf(a) === -1);

		// Put mines into the field
		for (let i = 0; i < mineCount; i++) {
			const ran = sample(avail)!;

			mineLocations.push(ran);
			delete avail[avail.indexOf(ran)];

			avail = avail.filter(a => !!a);
		}

		// Populate the radar
		for (let mineLocation of mineLocations) {
			let [x, y] = [mineLocation % w, (mineLocation / w) | 0];
			field[y][x] = bombSymbol;

			// Filter is used to prevent out-of-bound array access
			for (let _m of [
				[x - 1, y - 1], [x - 1, y], [x - 1, y + 1],
				[x, y - 1], [x, y], [x, y + 1],
				[x + 1, y - 1], [x + 1, y], [x + 1, y + 1]
			].filter(a => a[0] < w && a[0] > -1 && a[1] < h && a[1] > -1)) {
				// Add the surroundings of a bomb by 1
				if (field[_m[1]][_m[0]] !== bombSymbol) {
					field[_m[1]][_m[0]] = numberSymbols[numberSymbols.indexOf(field[_m[1]][_m[0]]) + 1];
				}
			}
		}

		return {
			content: {
				key: "mine.mine",
				data: {
					h, w, mineCount,
					mineField: field.map((a, i) => a.map((b, j) =>
						// Show the 4 corners
						i === 0 && j === 0
							|| i === 0 && j === w - 1
							|| i === h - 1 && j === 0
							|| i === h - 1 && j === w - 1 ? b : `||${b}||`
					).join("")).join("\n")
				}
			}
		};
	}
};

export const mine = new Command({
	name: "mine"
});