import { SlashApplicationCommand } from "@app/classes/ApplicationCommand";
import { t } from "@app/i18n/token";
import { PrismaClient } from "@prisma/client";
import type { ChatInputCommandInteraction, InteractionReplyOptions } from "discord.js";

const client = new PrismaClient();

class Command extends SlashApplicationCommand {
	public async onCommand(interaction: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
		await client.language.deleteMany({
			where: {
				id: interaction.user.id,
				type: "u"
			}
		});

		return {
			content: t("forgetme.success")
		};
	}
}

export const forgetme = new Command({
	name: "forgetme"
});