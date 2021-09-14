// A heartful sorry for users...
import * as i18n from '@app/i18n';
import { Module, ModuleActionArgument } from '@type/Module';

export const module: Module = {
	trigger: ["link"],
	event: "messageCreate",
	action: async (obj: ModuleActionArgument) => {
		return await obj.message.reply(i18n.getString("migrate", "migrate", obj.message.getLocale()));
	}
};
