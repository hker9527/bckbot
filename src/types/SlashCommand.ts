import { ButtonInteraction, CommandInteraction, ContextMenuInteraction, MessageComponentInteraction, SelectMenuInteraction } from "discord.js";
import { CommandOptionBoolean, CommandOptionNumeric, CommandOptionString, CommandOptionSubCommand, CommandOptionSubCommandGroup, CommandOptionUser } from "./CommandOptions";

export type onFn<T> = (interaction: T) => Promise<Parameters<MessageComponentInteraction["reply"]>[0]>;

export interface Command {
	name: string,
	options?: (CommandOptionSubCommand | CommandOptionSubCommandGroup | CommandOptionString | CommandOptionNumeric | CommandOptionBoolean | CommandOptionUser)[],
	defer?: boolean,

	onButton?: onFn<ButtonInteraction>,
	onMessageComponent?: onFn<MessageComponentInteraction>,
	onSelectMenu?: onFn<SelectMenuInteraction>;
};

export interface SlashCommand extends Command {
	description: string,
	onCommand: onFn<CommandInteraction>,
};

export interface ContextMenuCommand extends Command {
	type: 'MESSAGE' | 'USER',
	onContextMenu: onFn<ContextMenuInteraction>;
};