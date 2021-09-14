import { Module, ModuleActionArgument } from "@type/Module";

export const module: Module = {
	trigger: ["invite"],
	event: "messageCreate",
	eval: {
		"id": "client.user.id"
	},
	action: async (obj: ModuleActionArgument) => {
		return obj.message.reply("<https://discordapp.com/oauth2/authorize?&client_id=" + obj.eval!.id + "&scope=bot&permissions=252992>");
	}
};
