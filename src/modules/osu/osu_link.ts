// A heartful sorry for users...
import { getString } from "@app/i18n";
import { Singleton } from "@app/Singleton";
import { ArgumentRequirement, Module, ModuleActionArgument } from '@type/Module';
import { assert } from "console";

export const module: Module = {
	trigger: ["link"],
	event: "messageCreate",
	argv: {
		id: [ArgumentRequirement.Required, ArgumentRequirement.Concat],
	},
	action: async (obj: ModuleActionArgument) => {
		const osuId = Singleton.db!.data!.osuLink[obj.message.author.id];

		if (osuId) {
			return await obj.message.reply(getString("osu.link.exists", obj.message.getLocale()));
		}

		try {
			const apiResponse = await Singleton.osuClient!.users.get(
				obj.argv!.id
			);

			assert(apiResponse.user_id);

			Singleton.db!.data!.osuLink[obj.message.author.id] = apiResponse.user_id;

			return await obj.message.reply(
				getString("osu.link.linked", obj.message.getLocale(), {
					discord_id: obj.message.author.toString(),
					osu_id: apiResponse.username
				})
			);
		} catch (e) {
			return await obj.message.reply(
				getString("osu.error", obj.message.getLocale(), { id: obj.argv!.id })
			);
		}
	}
};
