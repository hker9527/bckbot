// A heartful sorry for users...

import { Module, ModuleActionArgument } from "@type/Module";
import * as i18n from "@app/i18n";

export const module: Module = {
	trigger: ["s", "t", "m", "c"],
	event: "messageCreate",
	action: async (obj: ModuleActionArgument) => {
		return await obj.message.reply(i18n.getString("migrate", "migrate", obj.message.getLocale()));
	}
};
