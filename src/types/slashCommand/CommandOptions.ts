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

export interface CommandOptionSubCommand extends CommandOption {
	type: "SUB_COMMAND";
};

export interface CommandOptionSubCommandGroup extends CommandOption {
	type: "SUB_COMMAND_GROUP";
};

export interface CommandOptionString extends CommandOption {
	type: "STRING",
	choices?: CommandOptionChoice<string>[];
};

export interface CommandOptionNumeric extends CommandOption {
	type: "INTEGER" | "NUMBER",
	choices?: CommandOptionChoice<number>[],
	min_value?: number,
	max_value?: number;
};

export interface CommandOptionBoolean extends CommandOption {
	type: "BOOLEAN";
};

export interface CommandOptionUser extends CommandOption {
	type: "USER";
}