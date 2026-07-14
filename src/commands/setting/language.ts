import { SlashApplicationCommand } from "@app/classes/ApplicationCommand";
import { t } from "@app/i18n/token";
import type { LApplicationCommandOptionData } from "@class/ApplicationCommandOptionData";
import type { InteractionReplyOptions } from "discord.js";
import { PrismaClient } from "@prisma/client";
import type { ChatInputCommandInteraction } from "discord.js";

const client = new PrismaClient();

class Command extends SlashApplicationCommand {
	public options: LApplicationCommandOptionData[] = [
		{
			name: "language",
			type: "String",
			choices: [
				{
					name: "default",
					value: "default"
				},
				{
					name: "english",
					value: "en-US"
				},
				{
					name: "tchinese",
					value: "zh-TW"
				}
			]
		}
	];

	public async onCommand(interaction: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
		const language = interaction.options.getString("language");
		if (language) {
			switch (language) {
				case "default":
					await client.language.deleteMany({
						where: {
							id: interaction.user.id,
							type: "u"
						}
					});

					return {
						content: t("language.resetSuccess"),
						ephemeral: true
					};
				default:
					await client.language.upsert({
						where: {
							id: interaction.user.id,
							type: "u"
						},
						create: {
							id: interaction.user.id,
							type: "u",
							language,
							override: true
						},
						update: {
							language,
							override: true
						}
					});

					return {
						content: t("language.setSuccess", {
							language: `$t(language.${language})`
						}),
						ephemeral: true
					};
			}
		} else {
			const languageItem = await client.language.findFirst({
				where: {
					id: interaction.user.id,
					type: "u"
				}
			});
			if (languageItem) {
				return {
					content: t("language.current", {
						language: `$t(language.${languageItem.language})`,
						override: languageItem.override ? "🔒" : "🔓"
					}),
					ephemeral: true
				}
			}

			return {
				content: t("language.notFound"),
				ephemeral: true
			}
		}
	}
}

export const language = new Command({
	name: "language"
});