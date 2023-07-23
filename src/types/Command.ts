import { LocalizableApplicationCommandOptionData } from "@app/adapters/ApplicationCommandOptionData";
import { LocalizableInteractionReplyOptions } from "@localizer/InteractionReplyOptions";
import { ButtonInteraction, ChatInputCommandInteraction, CommandInteraction, MessageComponentInteraction, MessageContextMenuCommandInteraction, SelectMenuInteraction, UserContextMenuCommandInteraction } from "discord.js";
import { Dictionary } from "./Dictionary";

type onFn<T> = (interaction: T) => Promise<LocalizableInteractionReplyOptions>;

interface ApplicationCommand<D extends boolean> {
	defer: D;
	name: string;

	onButton?: onFn<ButtonInteraction>;
	onMessageComponent?: onFn<MessageComponentInteraction>;
	onSelectMenu?: onFn<SelectMenuInteraction>;

	onTimeout?: onFn<Awaited<ReturnType<CommandInteraction["editReply"]>>>;
};

export interface SlashApplicationCommand<D extends boolean> extends ApplicationCommand<D> {
	options?: Dictionary<LocalizableApplicationCommandOptionData>;

	onCommand: onFn<ChatInputCommandInteraction>;
};

export interface ContextMenuApplicationCommand<D extends boolean> extends ApplicationCommand<D> {
	onMessageContextMenu?: onFn<MessageContextMenuCommandInteraction>;
	onUserContextMenu?: onFn<UserContextMenuCommandInteraction>;
};

export type SlashApplicationCommands = SlashApplicationCommand<true> | SlashApplicationCommand<false>;
export type ContextMenuApplicationCommands = ContextMenuApplicationCommand<true> | ContextMenuApplicationCommand<false>;

export type Command = SlashApplicationCommands | ContextMenuApplicationCommands;