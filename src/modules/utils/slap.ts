import { Module, ArgumentRequirement, ModuleActionArgument } from "@type/Module";
import * as utils from "@app/utils";
import * as i18n from "@app/i18n";
import emoji from "node-emoji";

export const module: Module = {
	trigger: ["slap", "slaps"],
	event: "messageCreate",
	argv: {
		victim: [ArgumentRequirement.Required],
		tool: [ArgumentRequirement.Optional, ArgumentRequirement.Concat],
	},
	action: async (obj: ModuleActionArgument) => {
		return obj.message.channel.send(
			await i18n.getString("slap", "slap", i18n.Languages.English, {
				slapper: obj.message.author.toString(),
				victim: obj.argv!.victim,
				// TODO: Fix emoji that cannot display (message.react?)
				tool: (obj.argv!.tool ?? emoji.random().emoji),
				damage: utils.urandom(
					utils.arr2obj(
						[
							utils.random(50, 100),
							utils.random(100, 300),
							utils.random(300, 600),
							utils.random(600, 1000),
						],
						[0.1, 0.6, 0.2, 0.1]
					)
				)
			})
		);
	},
};
