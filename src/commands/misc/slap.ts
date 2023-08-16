import { arr2obj, random, urandom } from "@app/utils";
import { SlashApplicationCommand } from "@class/ApplicationCommand";
import { LApplicationCommandOptionData } from "@class/ApplicationCommandOptionData";
import { LInteractionReplyOptions } from "@localizer/InteractionReplyOptions";
import { ChatInputCommandInteraction } from "discord.js";
import { random as emoji } from "node-emoji";

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
