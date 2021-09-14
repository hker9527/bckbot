import * as utils from '@app/utils';
import { ArgumentRequirement, Module, ModuleActionArgument } from '@type/Module';

function shuffleArray(array: any[]) {
	for (let i = array.length - 1; i > 0; i--) {
		let j = utils.random(0, i);
		[array[i], array[j]] = [array[j], array[i]];
	}
}

export const module: Module = {
	trigger: ["cho", "choice", "choices"],
	event: "messageCreate",
	argv: {
		"choices": [ArgumentRequirement.Required, ArgumentRequirement.Concat]
	},
	action: async (obj: ModuleActionArgument) => {
		const argv = obj.argv!.choices.split(" ").filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

		if (argv.length < 2) {
			return await obj.message.reply("Not enough choices");
		}

		const last = argv.pop()!;
		shuffleArray(argv);

		let pMax = 1;
		type Option = [string, number];

		const o: Option[] = [];

		for (const i in argv) {
			const p = utils.random(0, pMax * 100000) / 100000;
			o.push([argv[i], p]);
			pMax = pMax - p;
		}
		o.push([last, pMax]);

		return await obj.message.reply("Result: " + o.sort((a: Option, b: Option) => {
			return b[1] - a[1];
		}).map((a: Option) => {
			return a[0] + " (" + utils.round(a[1] * 100, 3) + "%)";
		}).join(" "));
	}
};
