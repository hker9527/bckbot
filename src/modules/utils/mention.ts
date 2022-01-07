import { req2json } from "@app/utils";
import { StealthModule, StealthModuleActionArgument } from "@type/StealthModule";

export const module: StealthModule = {
	event: "messageCreate",
	eval: {
		id: "client.user.id"
	},
	action: async (obj: StealthModuleActionArgument) => {
		if (obj.message.mentions.users.has(obj.eval!.id)) {
			const json = await req2json("https://api.quotable.io/random");

			return {
				type: "reply",
				result: `\n${json.content}\n - \`${json.author}\``
			};
		}
		return false;
	}
};
