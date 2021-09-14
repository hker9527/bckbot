import * as i18n from '@app/i18n';
import * as utils from '@app/utils';
import { Module, ModuleActionArgument } from '@type/Module';

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
