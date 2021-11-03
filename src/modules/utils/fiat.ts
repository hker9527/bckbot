import * as utils from '@app/utils';
import { Dictionary } from '@type/Dictionary';
import { ArgumentRequirement, Module, ModuleActionArgument } from '@type/Module';
import assert from "assert";

const CURRENCY = ["TWD", "HKD", "JPY", "USD", "EUR"];
const data: Dictionary<Dictionary<number>> = utils.arr2obj(CURRENCY, [...new Array(CURRENCY.length)].map(a => ({})));
let lastUpdate: Date;

async function worker() {
	let response;
	try {
		for (let i of CURRENCY) {
			for (let j of CURRENCY) {
				if (i == j) continue;
				response = await utils.req2json(`https://free.currconv.com/api/v7/convert?q=${i}_${j},${j}_${i}&compact=ultra&apiKey=${process.env.currency}`);
				assert(!isNaN(response[`${i}_${j}`]) && !isNaN(response[`${j}_${i}`]));
				data[i][j] = response[`${i}_${j}`];
				data[j][i] = response[`${j}_${i}`];
			}
		}

		lastUpdate = new Date();
		return true;
	} catch (e) {
		throw new Error("```\nCurrency update failed, data=\n" + JSON.stringify(response, null, 4) + "\n```");
	}
}

export const module: Module = {
	trigger: CURRENCY.map(a => a.toLowerCase()),
	event: "messageCreate",
	argv: {
		"amount": [ArgumentRequirement.Optional],
		"target": [ArgumentRequirement.Optional]
	},
	init: worker,
	interval: {
		f: worker,
		t: 3600 * 1000
	},
	action: async (obj: ModuleActionArgument) => {
		const currency = obj.trigger.toUpperCase();
		const amount = parseFloat(obj.argv!.amount ?? 1);

		return obj.message.reply(`\`${amount}\`${obj.trigger.toUpperCase()} = ${CURRENCY.filter(_currency => _currency != currency && (obj.argv!.target ? _currency === obj.argv!.target.toUpperCase() : true)).map(_currency => `\`${utils.round(amount * data[obj.trigger.toUpperCase()][_currency], 2)}\`` + _currency).join(" = ")}`);
	}
};
