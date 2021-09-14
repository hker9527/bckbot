import * as i18n from '@app/i18n';
import * as utils from '@app/utils';
import { ArgumentRequirement, Module, ModuleActionArgument } from '@type/Module';

enum Answer {
	Good,
	Fair,
	Bad
};

const emoji = ["🟢", "🟡", "🔴"];

export const module: Module = {
	trigger: ["8ball", "ask"],
	event: "messageCreate",
	argv: {
		"question": [ArgumentRequirement.Required]
	},
	action: async (obj: ModuleActionArgument) => {
		const type = utils.random(Answer.Good, Answer.Bad) as Answer;

		const msg = await obj.message.channel.send("🤔\t...");
		await utils.delay(1000);
		return await msg.edit(`${emoji[type]}\t${i18n.getString("magicball", `answer${type === Answer.Good ? utils.random(0, 9) : (type === Answer.Fair ? utils.random(10, 14) : utils.random(15, 19))}`, obj.message.getLocale())}`);
	}
};
