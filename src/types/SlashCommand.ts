import { ApplicationCommandOptionType, ButtonInteraction, CommandInteraction, ContextMenuInteraction, Interaction, MessageComponentInteraction, SelectMenuInteraction } from "discord.js";

type SlashCommandOption = {
	name: string,
	description: string,
	type: ApplicationCommandOptionType;
};

export type SlashCommand = {
	name: string,
	description: string,
	options?: SlashCommandOption[],
	
	onCommand?: (interaction: CommandInteraction) => any, // TODO: unify return value
	onButton?: (interaction: ButtonInteraction) => any,
	onContextMenu?: (interaction: ContextMenuInteraction) => any,
	onMessageComponent?: (interaction: MessageComponentInteraction) => any,
	onSelectMenu?: (interaction: SelectMenuInteraction) => any
};