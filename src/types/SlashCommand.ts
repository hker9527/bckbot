import { ButtonInteraction, CommandInteraction, ContextMenuInteraction, MessageComponentInteraction, SelectMenuInteraction } from "discord.js";
import { ChannelTypes } from "discord.js/typings/enums";

type CommandOptionChoice<T> = {
	name: string,
	value: T;
};

interface CommandOption {
	name: string,
	description: string,
	descriptionRaw?: boolean,
	optional?: boolean,
	channel_types?: ChannelTypes,
	autocomplete?: boolean;
};

interface CommandOptionSubCommand extends CommandOption {
	type: "SUB_COMMAND";
};

interface CommandOptionSubCommandGroup extends CommandOption {
	type: "SUB_COMMAND_GROUP";
};

interface CommandOptionString extends CommandOption {
	type: "STRING",
	choices?: CommandOptionChoice<string>[];
};

interface CommandOptionInteger extends CommandOption {
	type: "INTEGER",
	choices?: CommandOptionChoice<number>[],
	min_value?: number,
	max_value?: number;
};

interface CommandOptionBoolean extends CommandOption {
	type: "BOOLEAN";
};

interface CommandOptionUser extends CommandOption {
	type: "USER";
}

export interface Command {
	name: string,
	options?: (CommandOptionSubCommand | CommandOptionSubCommandGroup | CommandOptionString | CommandOptionInteger | CommandOptionBoolean | CommandOptionUser)[];

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