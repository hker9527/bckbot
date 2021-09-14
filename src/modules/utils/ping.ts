import { Module, ArgumentRequirement, ModuleActionArgument } from "@type/Module";

export const module: Module = {
	trigger: ["ping"],
	event: "messageCreate",
	action: async (obj: ModuleActionArgument) => {
		return await obj.message.reply("Pong!");
	}
};