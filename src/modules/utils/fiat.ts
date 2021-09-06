import { Dictionary } from "@app/types/Dictionary";
import { Module, ArgumentRequirement, ModuleActionArgument } from "@app/types/Module";
import * as utils from "../_utils";

const CURRENCY = ["TWD", "HKD", "JPY", "USD"];
const data: Dictionary<Dictionary<number>> = utils.arr2obj(CURRENCY, [...new Array(CURRENCY.length)].map(a => ({})));
let lastUpdate: Date;

async function worker() {
	try {
		for (let i of CURRENCY) {
			for (let j of CURRENCY) {
				if (i == j) continue;
				let _data = await utils.req2json(`https://free.currconv.com/api/v7/convert?q=${i}_${j},${j}_${i}&compact=ultra&apiKey=${process.env.currency}`);
				data[i][j] = _data[i + "_" + j];
				data[j][i] = _data[j + "_" + i];
			}
		}

		lastUpdate = new Date();
		return true;
	} catch (e) {
		throw new Error("```\nCurrency update failed, data=\n" + JSON.stringify(data, null, 4) + "\n```");
	}
}

export const module: Module = {
	trigger: CURRENCY.map(a => a.toLowerCase()),
	event: "messageCreate",
	argv: {
		"amount": [ArgumentRequirement.Optional]
	},
	init: worker,
	interval: {
		f: worker,
		t: 3600 * 1000
	},
	action: async (obj: ModuleActionArgument) => {
		let txt = utils.extArgv(obj.message, true);
		let argv = utils.parseArgv(txt);

		let currency = obj.trigger.toUpperCase();
		let amount = parseFloat(argv[0] ?? 100);

		return obj.message.reply(`\`${amount}\`${obj.trigger.toUpperCase()} = ${CURRENCY.filter(_currency => _currency != currency).map(_currency => `\`${utils.round(amount * data[obj.trigger.toUpperCase()][_currency], 2)}\`` + _currency).join(" = ")}`);
	}
};
