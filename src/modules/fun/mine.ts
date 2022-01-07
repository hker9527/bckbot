import { random, randomArrayElement } from "@app/utils";
import { SlashCommand } from "@type/SlashCommand";

const numberSymbols = "　１２３４５６７８９".split("");
const bombSymbol = "Ｘ";

export const module: SlashCommand = {
	name: "mine",
	description: "Generate a minesweeper.",
	options: [
		{
			name: "h",
			description: "Height",
			type: "INTEGER",
			min_value: 3,
			max_value: 14,
			optional: true
		}, {
			name: "w",
			description: "Width",
			type: "INTEGER",
			min_value: 3,
			max_value: 14,
			optional: true
		}, {
			name: "n",
			description: "Mines",
			type: "INTEGER",
			min_value: 1,
			max_value: 191,
			optional: true
		}
	],
	onCommand: async (interaction) => {
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
			let ran = randomArrayElement(avail);

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
			key: "mine", 
			data: {
				h, w, mineCount,
				mineField: field.map(a => a.map(b => `||${b}||`).join("")).join("\n")
			}
		};
	}
};
