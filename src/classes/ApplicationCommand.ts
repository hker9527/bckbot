import { getDescription, getName } from "@app/Localizations";

import type { ApplicationCommandDataResolvable, BaseMessageOptions, ButtonInteraction, ChatInputCommandInteraction, InteractionReplyOptions, Message, MessageComponentInteraction, MessageContextMenuCommandInteraction, StringSelectMenuInteraction, UserContextMenuCommandInteraction } from "discord.js";
import { ApplicationCommandType } from "discord.js";
import type { LApplicationCommandOptionData } from "./ApplicationCommandOptionData";
import { ApplicationCommandOption } from "./ApplicationCommandOptionData";
import { Custom } from "./custom";

export abstract class BaseApplicationCommand<T extends ApplicationCommandType> extends Custom<ApplicationCommandDataResolvable> {
	protected _type: T;
	protected _name: string;
	protected _nsfw: boolean;
	protected _defer: boolean;

	public constructor(argv: {
		type: T,
		name: string,
		nsfw?: boolean,
		defer?: boolean
	}) {
		super();

		this._type = argv.type;
		this._name = argv.name;
		this._nsfw = argv.nsfw ?? false;
		this._defer = argv.defer ?? false;
	}

	// Getters
	public get type(): T {
		return this._type;
	}

	public get name(): string {
		return this._name;
	}

	public get nsfw(): boolean {
		return this._nsfw;
	}

	public get defer(): boolean {
		return this._defer;
	}
	
	public toAPI(): ApplicationCommandDataResolvable {
		if (this.isSlashApplicationCommand()) {
			return {
				type: this._type,
				...getName(this._name),
				...getDescription(this._name),
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				options: Object.entries(this.options ?? {}).map(([_, lApplicationCommandChoicesData]) => {
					return new ApplicationCommandOption(this._name, lApplicationCommandChoicesData).toAPI();
				})
			};
		} else if (this.isMessageContextMenuCommand()) {
			return {
				type: this._type,
				...getName(this._name)
			}
		} else if (this.isUserContextMenuCommand()) {
			return {
				type: this._type,
				...getName(this._name)
			}
		}

		throw new Error("Invalid application command type");
	}

	// Type guards
	public isSlashApplicationCommand(): this is SlashApplicationCommand {
		return this._type === ApplicationCommandType.ChatInput;
	}

	public isMessageContextMenuCommand(): this is MessageContextMenuCommand {
		return this._type === ApplicationCommandType.Message;
	}

	public isUserContextMenuCommand(): this is UserContextMenuCommand {
		return this._type === ApplicationCommandType.User;
	}
	
	// Events
	public async onButton?(interaction: ButtonInteraction): Promise<InteractionReplyOptions>;
	public async onMessageComponent?(interaction: MessageComponentInteraction): Promise<InteractionReplyOptions>;
	public async onSelectMenu?(interaction: StringSelectMenuInteraction): Promise<InteractionReplyOptions>;
	public async onTimeout?(message: Message): Promise<BaseMessageOptions>;
}

export abstract class SlashApplicationCommand extends BaseApplicationCommand<ApplicationCommandType.ChatInput> {
	public options?: LApplicationCommandOptionData[];

	public constructor(argv: {
		name: string,
		nsfw?: boolean,
		defer?: boolean,
	}) {
		super({
			type: ApplicationCommandType.ChatInput,
			...argv
		});
	}

	public abstract onCommand(interaction: ChatInputCommandInteraction): Promise<InteractionReplyOptions>;
}

export abstract class MessageContextMenuCommand extends BaseApplicationCommand<ApplicationCommandType.Message> {
	public constructor(argv: {
		name: string,
		nsfw?: boolean,
		defer?: boolean,
	}) {
		super({
			type: ApplicationCommandType.Message,
			...argv
		});
	}

	public abstract onContextMenu(interaction: MessageContextMenuCommandInteraction): Promise<InteractionReplyOptions>;
}

export abstract class UserContextMenuCommand extends BaseApplicationCommand<ApplicationCommandType.User> {
	public constructor(argv: {
		name: string,
		nsfw?: boolean,
		defer?: boolean,
	}) {
		super({
			type: ApplicationCommandType.User,
			...argv
		});
	}
	
	public abstract onContextMenu(interaction: UserContextMenuCommandInteraction): Promise<InteractionReplyOptions>;
}