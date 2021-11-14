import { ApplicationCommandOptionType, ButtonInteraction, CommandInteraction, ContextMenuInteraction, Interaction, MessageComponentInteraction, SelectMenuInteraction } from "discord.js";
import { ApplicationCommandTypes } from "discord.js/typings/enums";

type SlashCommandOption = {
	name: string,
	description: string,
	type: ApplicationCommandOptionType;
};

export interface Command {
	name: string,
	description: string,
	options?: SlashCommandOption[];

	onButton?: (interaction: ButtonInteraction) => Promise<any>,
	onMessageComponent?: (interaction: MessageComponentInteraction) => Promise<any>,
	onSelectMenu?: (interaction: SelectMenuInteraction) => Promise<any>;
};

export interface SlashCommand extends Command {
	onCommand: (interaction: CommandInteraction) => Promise<any>, // TODO: unify return value
};

export interface ContextMenuCommand extends Command { // TODO: How to make description not required???????
	type: 'MESSAGE' | 'USER',
	onContextMenu: (interaction: ContextMenuInteraction) => Promise<any>;
};