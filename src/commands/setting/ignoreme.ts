import { error } from "@app/Reporting";
import { SlashApplicationCommand } from "@app/classes/ApplicationCommand";
import type { LInteractionReplyOptions } from "@localizer/InteractionReplyOptions";
import { PrismaClient } from "@prisma/client";
import assert from "assert-ts";
import type { ButtonInteraction, ChatInputCommandInteraction } from "discord.js";

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
	public async onCommand(interaction: ChatInputCommandInteraction): Promise<LInteractionReplyOptions> {
		const item = await client.ignore.findFirst({
			where: {
				id: interaction.user.id,
				type: "u"
			}
		});

		return {
			content: {
				key: item ? "ignoreme.noticeWarning" : "ignoreme.ignoreWarning"
			},
			components: [
				{
					type: "ActionRow",
					components: [
						{
							customId: item ? "noticeme" : "ignoreme",
							type: "Button",
							style: "Success",
							emoji: "✅"
						}
					]
				}
			],
			ephemeral: true
		}
	}

	public async onButton(interaction: ButtonInteraction): Promise<LInteractionReplyOptions> {
		await interaction.deferUpdate();
		await setUserIgnore(interaction.user.id, interaction.customId === "ignoreme");

		return {
			content: {
				key: "ignoreme.success"
			}
		};
	}
}

export const ignoreme = new Command({
	name: "ignoreme"
});