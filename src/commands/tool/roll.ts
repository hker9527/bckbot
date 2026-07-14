import { random } from "@app/utils";
import { t } from "@app/i18n/token";

import { SlashApplicationCommand } from "@class/ApplicationCommand";
import type { LApplicationCommandOptionData } from "@class/ApplicationCommandOptionData";
import type { InteractionReplyOptions } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";

class Command extends SlashApplicationCommand {
	public options: LApplicationCommandOptionData[] = [
		{
			name: "upper",
			type: "Integer"
		},
		{
			name: "lower",
			type: "Integer"
		}
	];

	public async onCommand(interaction: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
		const lower = interaction.options.getInteger("lower") ?? 0;
		const upper = interaction.options.getInteger("upper") ?? (lower + 100);

		if (lower > upper) {
			return {
				content: t("roll.invalidRange", { lower, upper })
			};
		}

		return {
			content: t("roll.roll", {
				points: random(lower, upper)
			})
		};
	}
};

export const roll = new Command({
	name: "roll"
});