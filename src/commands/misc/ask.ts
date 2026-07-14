import { SlashApplicationCommand } from "@app/classes/ApplicationCommand";
import type { InteractionReplyOptions } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";

import { random } from "@app/utils";
import { t } from "@app/i18n/token";
import type { LApplicationCommandOptionData } from "@class/ApplicationCommandOptionData";

const map = {
	Good: 0x28a745,
	Fair: 0xffc107,
	Bad: 0xdc3545
};

class Command extends SlashApplicationCommand {
	protected _defer = true;

	public options: LApplicationCommandOptionData[] = [
		{
			name: "question",
			type: "String",
			required: true
		}
	];

	public async onCommand(interaction: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
		const result = random(0, 19);
		const type = result < 10 ? "Good" : (result < 15 ? "Fair" : "Bad");

		await Bun.sleep(random(1000, 3000));

		return {
			embeds: [{
				color: map[type],
				footer: {
					text: t(`🤔\t$t(ask.answer${result})`)
				},
				author: {
					name: `${interaction.options.getString("question", true)}`
				}
			}]
		};
	}
}

export const ask = new Command({
	name: "ask"
});
