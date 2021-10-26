// A heartful sorry for users...
import { getString } from "@app/i18n";
import { Module, ModuleActionArgument } from '@type/Module';

export const module: Module = {
	trigger: ["rs", "rt", "rm", "rc"],
	event: "messageCreate",
	action: async (obj: ModuleActionArgument) => {
		return await obj.message.reply(getString("migrate", obj.message.getLocale()));
	}
};
