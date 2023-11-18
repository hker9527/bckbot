import { arr2obj, random } from "@app/utils";
import { SlashApplicationCommand } from "@class/ApplicationCommand";
import type { LApplicationCommandOptionData } from "@class/ApplicationCommandOptionData";
import type { LInteractionReplyOptions } from "@localizer/InteractionReplyOptions";
import assert from "assert-ts";
import Decimal from "decimal.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { random as emoji } from "node-emoji";

const urandom = (object: Record<string, Decimal | number>) => {
	const opt = Object.keys(object);

	if (opt.length === 1) {
		return opt[0];
	} else {
		const rand = Math.random();
		let sumProb = new Decimal(0);
		for (const prob of Object.values(object)) {
			sumProb = sumProb.add(new Decimal(prob));
		}
		assert(sumProb.toString() === "1", `sumProb != 1, got ${sumProb}`);

		sumProb.minus(object[opt[opt.length - 1]]);

		for (let i = opt.length - 1; i > 0; i--) {
			if (sumProb.lessThan(rand)) {
				return opt[i];
			} else {
				sumProb = sumProb.minus(object[opt[i - 1]]);
			}
		}

		return opt.shift()!;
	}
};


class Command extends SlashApplicationCommand {
	public options: LApplicationCommandOptionData[] = [
		{
			name: "victim",
			type: "String",
			required: true
		},
		{
			name: "tool",
			type: "String"
		}
	];

	public async onCommand(interaction: ChatInputCommandInteraction): Promise<LInteractionReplyOptions> {
		return {
			content: {
				key: "slap.slap",
				data: {
					slapper: interaction.member!.toString(),
					victim: interaction.options.getString("victim", true),
					// TODO: Fix emoji that cannot display (message.react?)
					tool: (interaction.options.getString("tool") ?? emoji().emoji),
					damage: urandom(
						arr2obj(
							[
								random(50, 100),
								random(100, 300),
								random(300, 600),
								random(600, 1000)
							],
							[0.1, 0.6, 0.2, 0.1]
						)
					)
				}
			}
		}
	}
};

export const slap = new Command({
	name: "slap"
});
