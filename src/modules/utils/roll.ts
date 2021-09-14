import { Module, ArgumentRequirement, ModuleActionArgument } from "@type/Module";
import * as utils from "@app/utils";
import * as i18n from "@app/i18n";

export const module: Module = {
	trigger: ["roll"],
	event: "messageCreate",
	action: async (obj: ModuleActionArgument) => {
		let txt = utils.extArgv(obj.message, true);
		let argv = utils.parseArgv(txt);

		return await obj.message.channel.send(i18n.getString("roll", "roll", obj.message.getLocale(), {
			points: utils.random(0, parseInt(argv[0] ?? 100, 10))
		}));
	}
};
