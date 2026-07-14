import { random } from "@app/utils";
import { t } from "@app/i18n/token";
import { SlashApplicationCommand } from "@class/ApplicationCommand";
import type { LApplicationCommandOptionData } from "@class/ApplicationCommandOptionData";
import type { InteractionReplyOptions } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";

class Command extends SlashApplicationCommand {
	public options: LApplicationCommandOptionData[] = [
		{
			name: "n",
			type: "Integer",
			required: true,
			minValue: 1
		},
		{
			name: "faces",
			type: "Integer",
			required: true,
			minValue: 1,
			maxValue: 0x198964
		},
		{
			name: "offset",
			type: "Integer"
		}
	];

	public async onCommand(interaction: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
		const n = interaction.options.getInteger("n", true);
		const faces = interaction.options.getInteger("faces", true);
		const offset = interaction.options.getInteger("offset") ?? 0;

		let result = 0;
		for (let i = 0; i < n; i++) {
			result += random(1, faces);
		}
		result += offset;

		return {
			content: t("dice.roll", {
				n,
				faces,
				offset: offset > 0 ? `+${offset}` : offset === 0 ? "" : offset,
				result
			})
		};
	}
};

export const dice = new Command({
	name: "dice"
});