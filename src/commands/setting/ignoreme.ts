import { error } from "@app/Reporting";
import { SlashApplicationCommand } from "@app/classes/ApplicationCommand";
import { t } from "@app/i18n/token";
import { PrismaClient } from "@prisma/client";
import assert from "assert-ts";
import type { ButtonInteraction, ChatInputCommandInteraction, InteractionReplyOptions } from "discord.js";
import { ButtonStyle, ComponentType } from "discord.js";

const client = new PrismaClient();

const setUserIgnore = async (id: string, ignore: boolean) => {
	try {
		if (ignore) {
			await client.ignore.create({
				data: {
					id,
					type: "u"
				}
			});
		} else {
			const result = await client.ignore.deleteMany({
				where: {
					id,
					type: "u"
				}
			});

			assert(result.count === 1, "Expected to delete one row");
		}

		return true;
	} catch (e) {
		error("ignoreme.setUserIgnore", e);
		return false;
	}
};

class Command extends SlashApplicationCommand {
	public async onCommand(interaction: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
		const item = await client.ignore.findFirst({
			where: {
				id: interaction.user.id,
				type: "u"
			}
		});

		return {
			content: t(item ? "ignoreme.noticeWarning" : "ignoreme.ignoreWarning"),
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							customId: item ? "noticeme" : "ignoreme",
							type: ComponentType.Button,
							style: ButtonStyle.Success,
							emoji: "✅"
						}
					]
				}
			],
			ephemeral: true
		}
	}

	public async onButton(interaction: ButtonInteraction): Promise<InteractionReplyOptions> {
		await interaction.deferUpdate();
		await setUserIgnore(interaction.user.id, interaction.customId === "ignoreme");

		return {
			content: t("ignoreme.success")
		};
	}
}

export const ignoreme = new Command({
	name: "ignoreme"
});