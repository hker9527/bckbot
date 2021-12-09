import { ButtonInteraction, CommandInteraction, ContextMenuInteraction, InteractionReplyOptions, MessageComponentInteraction, SelectMenuInteraction } from "discord.js";
import { CommandOptionBoolean, CommandOptionNumeric, CommandOptionString, CommandOptionSubCommand, CommandOptionSubCommandGroup, CommandOptionUser } from "./CommandOptions";
import { Dictionary } from "./Dictionary";
import { MessageComponents } from "./MessageComponents";

export interface SlashCommandResult extends Omit<InteractionReplyOptions, "content" | "components"> {
	content?: string | LocalizerData,
	components?: MessageComponents
};

export interface LocalizerData {
	key: string,
	data?: Dictionary<any>
};

export type onFn<T> = (interaction: T) => Promise<string | LocalizerData | SlashCommandResult>;

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