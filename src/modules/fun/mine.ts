import { getString } from "@app/i18n";
import * as utils from '@app/utils';
import { ArgumentRequirement, Module, ModuleActionArgument } from '@type/Module';

const numberSymbols = "　１２３４５６７８９".split("");
const bombSymbol = "Ｘ";

export const module: Module = {
	trigger: ["mine"],
	event: "messageCreate",
	argv: {
		"h": [ArgumentRequirement.Optional],
		"w": [ArgumentRequirement.Optional],
		"n": [ArgumentRequirement.Optional]
	},
	action: async (obj: ModuleActionArgument) => {
		const _h = utils.random(5, 10);
		const _w = utils.random(5, 10);
		const _mineCount = Math.max(1, _h * _w / utils.random(5, 10) | 0);

		let h = parseInt(obj.argv!.h) || _h;
		let w = parseInt(obj.argv!.w) || _w;
		let mineCount = parseInt(obj.argv!.n) || _mineCount;

		if (!h.inRange(0, 15)) h = _h;
		if (!w.inRange(0, 15)) w = _w;
		
		if (h * w > 200) {
			[h, w] = [_h, _w];
		}

		if (!mineCount.inRange(0, h * w - 4)) mineCount = Math.max(1, h * w / 10 | 0);

		const field = [...new Array(h)].map(a => [...new Array(w)].map(a => numberSymbols[0]));

		const mineLocations = [];

		// 4 corners are always safe
		let avail = [...new Array(h * w)].map((a, i) => i).filter(a => [0, w - 1, w * (h - 1), w * h - 1].indexOf(a) === -1);

		// Put mines into the field
		for (let i = 0; i < mineCount; i++) {
			let ran = utils.randomArrayElement(avail);

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
				if (field[_m[1]][_m[0]] != bombSymbol) {
					field[_m[1]][_m[0]] = numberSymbols[numberSymbols.indexOf(field[_m[1]][_m[0]]) + 1];
				}
			}
		}

		return await obj.message.channel.send(getString("mine", obj.message.getLocale(), {
			h, w, mineCount,
			mineField: field.map(a => a.map(b => `||${b}||`).join("")).join("\n")
		}));
	}
};
