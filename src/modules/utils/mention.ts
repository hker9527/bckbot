import { Singleton } from "@app/Singleton";
import { req2json } from "@app/utils";
import { StealthModule, StealthModuleActionArgument } from "@type/StealthModule";

export const module: StealthModule = {
	event: "messageCreate",
	action: async (obj: StealthModuleActionArgument) => {
		if (obj.message.mentions.users.has(Singleton.client.user!.id)) {
			const json = await req2json("https://api.quotable.io/random");

			return {
				type: "reply",
				result: `\n${json.content}\n - \`${json.author}\``
			};
		}
		return false;
	}
};
