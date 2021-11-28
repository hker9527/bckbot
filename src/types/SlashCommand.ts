import { ButtonInteraction, CommandInteraction, ContextMenuInteraction, MessageComponentInteraction, SelectMenuInteraction } from "discord.js";
import { CommandOptionSubCommand, CommandOptionSubCommandGroup, CommandOptionString, CommandOptionNumeric, CommandOptionBoolean, CommandOptionUser } from "./CommandOptions";

export interface Command {
	name: string,
	options?: (CommandOptionSubCommand | CommandOptionSubCommandGroup | CommandOptionString | CommandOptionNumeric | CommandOptionBoolean | CommandOptionUser)[];

	onButton?: (interaction: ButtonInteraction) => Promise<any>,
	onMessageComponent?: (interaction: MessageComponentInteraction) => Promise<any>,
	onSelectMenu?: (interaction: SelectMenuInteraction) => Promise<any>;
};

export interface SlashCommand extends Command {
	description: string,
	onCommand: (interaction: CommandInteraction) => Promise<any>, // TODO: unify return value
};

export interface ContextMenuCommand extends Command {
	type: 'MESSAGE' | 'USER',
	onContextMenu: (interaction: ContextMenuInteraction) => Promise<any>;
};