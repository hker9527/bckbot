import { Module, ArgumentRequirement, ModuleActionArgument } from "@type/Module";
import * as utils from "@app/utils";

export const module: Module = {
	trigger: ["dice", "d"],
	event: "messageCreate",
	argv: {
		"cmd": [ArgumentRequirement.Required]
	},
	action: async (obj: ModuleActionArgument) => {
		let txt = utils.extArgv(obj.message, true);
		let argv = utils.parseArgv(txt);

		let re = /^([1-9]\d{0,2})d([1-9]\d{0,2})([+-]\d{1,3})?$/;
		let tmp;
		if (!utils.isValid(argv[0]) || !(tmp = argv[0].match(re))) {
			return await obj.message.reply("Format: __n__d__f__[+-o]\nn: Number of dice\tf: Faces\to: Offset");
		} else { // ndf+o
			const [_, n, faces, offset] = tmp.map(a => parseInt(a));

			let result = 0;
			for (let i = 0; i < n; i++) {
				result += utils.random(1, faces);
			}
			result += offset || 0;
			return await obj.message.reply(`Rolling a ${faces}-faced dice for ${n} times${(!isNaN(offset) ? " with " + offset + " offset" : "")}.\nResult: \`${result}\``);
		}
	}
};
