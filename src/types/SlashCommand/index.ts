import { ButtonInteraction, CommandInteraction, ContextMenuInteraction, MessageComponentInteraction, SelectMenuInteraction } from "discord.js";
import { Localizable } from "@app/localizers/Data";
import { CommandOptionBoolean, CommandOptionNumeric, CommandOptionString, CommandOptionSubCommand, CommandOptionSubCommandGroup, CommandOptionUser } from "./CommandOptions";
import { SlashCommandResultType } from "./result";

export type onFn<T> = (interaction: T) => Promise<Localizable | SlashCommandResultType>;

export interface Command {
	name: Localizable,
	options?: (CommandOptionSubCommand | CommandOptionSubCommandGroup | CommandOptionString | CommandOptionNumeric | CommandOptionBoolean | CommandOptionUser)[],
	defer?: boolean,

	onButton?: onFn<ButtonInteraction>,
	onMessageComponent?: onFn<MessageComponentInteraction>,
	onSelectMenu?: onFn<SelectMenuInteraction>;
}

export interface SlashCommand extends Command {
	name: string,
	description: Localizable,
	onCommand: onFn<CommandInteraction>,
}

export interface ContextMenuCommand extends Command {
	type: "MESSAGE" | "USER",
	onContextMenu: onFn<ContextMenuInteraction>;
}