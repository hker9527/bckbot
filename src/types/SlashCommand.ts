import { Snowflake } from "discord-api-types/v9";
import { ButtonInteraction, CommandInteraction, ContextMenuInteraction, MessageButtonStyle, MessageComponentInteraction, SelectMenuInteraction } from "discord.js";
import { ChannelTypes } from "discord.js/typings/enums";
import { RangedArray, RangedArray25 } from "./RangedArray";
import { RangedNumber } from "./RangedNumber";

// Command options

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

interface CommandOptionNumeric extends CommandOption {
	type: "INTEGER" | "NUMBER",
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

interface CustomEmoji {
	id: Snowflake
};

interface BuiltInEmoji {
	name: string
};

type Emoji = CustomEmoji | BuiltInEmoji;

// Message Components
interface MessageComponentBaseButton {
	type: "BUTTON"
	disabled?: boolean,

	label: string,
	emoji?: Emoji,
}

interface MessageComponentColoredButton extends MessageComponentBaseButton {
	custom_id: string,
	style: Exclude<MessageButtonStyle, "LINK">//"PRIMARY" | "SECONDARY" | "SUCCESS" | "DANGER"
}

interface MessageComponentLinkButton extends MessageComponentBaseButton {
	style: "LINK",
	url: string
}

type MessageComponentButton = MessageComponentColoredButton | MessageComponentLinkButton;

export type MessageComponentSelectMenuOption = {
	label: string;
	value: string;
	description?: string;
	emoji?: Emoji;
	default?: boolean;
};

interface MessageComponentSelectMenu {
	type: "SELECT_MENU",
	custom_id: string,
	disabled?: boolean,
	options: RangedArray25<MessageComponentSelectMenuOption>,
	placeholder?: string,
	min_values?: RangedNumber<0, 25>,
	max_values?: RangedNumber<0, 25>
};

export type MessageComponentActionRow = RangedArray<MessageComponentButton, 1, 6> | [MessageComponentSelectMenu]

export type MessageComponents = RangedArray<MessageComponentActionRow, 1, 5>
// Commands

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