import { Module, ArgumentRequirement, ModuleActionArgument } from "@app/types/Module";
import * as utils from "../_utils";
import * as i18n from "../i18n";

export const module: Module = {
	trigger: ["roll"],
	event: "messageCreate",
	action: async (obj: ModuleActionArgument) => {
		let txt = utils.extArgv(obj.message, true);
		let argv = utils.parseArgv(txt);

		return await obj.message.channel.send(await i18n.getString("roll", "roll", i18n.Languages.English, {
			points: utils.random(0, parseInt(argv[0] ?? 100, 10))
		}));
	}
};
