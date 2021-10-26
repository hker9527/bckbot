// A heartful sorry for users...
import { getString } from "@app/i18n";
import { Module, ModuleActionArgument } from '@type/Module';

export const module: Module = {
	trigger: ["link"],
	event: "messageCreate",
	action: async (obj: ModuleActionArgument) => {
		return await obj.message.reply(getString("migrate", obj.message.getLocale()));
	}
};
