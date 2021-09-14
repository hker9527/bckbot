import { Module, ArgumentRequirement, ModuleActionArgument } from "@type/Module";
import * as utils from "@app/utils";

const num = "　１２３４５６７８９".split("");
const bomb = "Ｘ";

export const module: Module = {
	trigger: ["mine"],
	event: "messageCreate",
	argv: {
		"x": [ArgumentRequirement.Optional],
		"y": [ArgumentRequirement.Optional]
	},
	action: async (obj: ModuleActionArgument) => {
		let txt = utils.extArgv(obj.message, true);
		let argv = utils.parseArgv(txt);

		const [_h, _w, _n] = [argv[0], argv[1], argv[2]].map(a => parseInt(a));
		let [h, w] = [utils.random(5, 10), utils.random(5, 10)]; // max: 200?
		if (_h && _w && _h > 3 && _w > 3 && _h * _w < 200) {
			[h, w] = [_h, _w];
		}

		const mineArr = [...new Array(h)].map(a => [...new Array(w)].map(a => num[0]));
		const mineCount = _n && _n < (h * w - 3) ? _n : ((h * w / 10) | 0);

		const mines = [];
		let avail = [...new Array(h * w)].map((a, i) => i).filter(a => [0, w - 1, w * (h - 1), w * h - 1].indexOf(a) == -1);

		for (let i = 0; i < mineCount; i++) {
			let ran = utils.randomArrayElement(avail);

			mines.push(ran);
			delete avail[avail.indexOf(ran)];

			avail = avail.filter(a => !!a);
		}

		console.log(mines);
		for (let m of mines) {
			let [x, y] = [m % w, (m / w) | 0];
			mineArr[y][x] = bomb;
			for (let _m of [
				[x - 1, y - 1], [x - 1, y], [x - 1, y + 1],
				[x, y - 1], [x, y], [x, y + 1],
				[x + 1, y - 1], [x + 1, y], [x + 1, y + 1]
			].filter(a => a[0] < w && a[0] > -1 && a[1] < h && a[1] > -1)) {
				if (mineArr[_m[1]][_m[0]] != bomb) {
					mineArr[_m[1]][_m[0]] = num[num.indexOf(mineArr[_m[1]][_m[0]]) + 1];
				}
			}
		}

		return obj.message.channel.send(mineArr.map(a => a.map(b => "||" + b + "||").join("")).join("\n"));
	}
};
