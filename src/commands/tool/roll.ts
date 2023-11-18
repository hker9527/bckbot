import { random } from "@app/utils";

import { SlashApplicationCommand } from "@class/ApplicationCommand";
import type { LApplicationCommandOptionData } from "@class/ApplicationCommandOptionData";
import type { LInteractionReplyOptions } from "@localizer/InteractionReplyOptions";
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

	public async onCommand(interaction: ChatInputCommandInteraction): Promise<LInteractionReplyOptions> {
		const lower = interaction.options.getInteger("lower") ?? 0;
		const upper = interaction.options.getInteger("upper") ?? (lower + 100);

		if (lower > upper) {
			return {
				content: {
					key: "roll.invalidRange",
					data: { lower, upper }
				}
			};
		}

		return {
			content: {
				key: "roll.roll",
				data: {
					points: random(lower, upper)
				}
			}
		};
	}
};

export const roll = new Command({
	name: "roll"
});