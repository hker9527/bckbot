import * as utils from '@app/utils';
import { Module, ModuleActionArgument } from '@type/Module';

export const module: Module = {
	trigger: ["*mention"],
	event: "messageCreate",
	eval: {
		id: "client.user.id"
	},
	action: async (obj: ModuleActionArgument) => {
		if (obj.message.mentions.users.has(obj.eval!.id)) {
			const json = await utils.req2json("https://api.quotable.io/random");

			return await obj.message.reply(
				`\n${json.content}\n - \`${json.author}\``
			);
		}
		return false;
	}
};
