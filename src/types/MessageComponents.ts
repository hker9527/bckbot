import { MessageButtonStyle, Snowflake } from "discord.js";
import { RangedArray25 } from "./RangedArray";
import { RangedNumber } from "./RangedNumber";

interface CustomEmoji {
	id: Snowflake;
};

interface BuiltInEmoji {
	name: string;
};

type Emoji = CustomEmoji | BuiltInEmoji;

interface MessageComponentBaseButton {
	type: "BUTTON";
	disabled?: boolean,

	label: string,
	emoji?: Emoji,
}

interface MessageComponentColoredButton extends MessageComponentBaseButton {
	custom_id: string,
	style: Exclude<MessageButtonStyle, "LINK">;
}

interface MessageComponentLinkButton extends MessageComponentBaseButton {
	style: "LINK",
	url: string;
}

export type MessageComponentButton = MessageComponentColoredButton | MessageComponentLinkButton;

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
	max_values?: RangedNumber<0, 25>;
};

export type MessageComponentActionRow = MessageComponentButton[] | [MessageComponentSelectMenu];

export type MessageComponents = MessageComponentActionRow[];