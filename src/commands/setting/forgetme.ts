import { SlashApplicationCommand } from "@app/classes/ApplicationCommand";
import { LInteractionReplyOptions } from "@localizer/InteractionReplyOptions";
import { PrismaClient } from "@prisma/client";
import { ChatInputCommandInteraction } from "discord.js";

const client = new PrismaClient();

class Command extends SlashApplicationCommand {
    public async onCommand(interaction: ChatInputCommandInteraction): Promise<LInteractionReplyOptions> {
        await client.language.deleteMany({
            where: {
                id: interaction.user.id,
                type: "u"
            }
        });

        return {
            content: {
                key: "forgetme.success"
            }
        };
    }
}

export const forgetme = new Command({
    name: "forgetme"
});