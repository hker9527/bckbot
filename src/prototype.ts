import { getLocale, Languages, parseLocaleString, setLocale } from "@app/i18n";
import { Message, Channel, Guild, Interaction, ContextMenuInteraction, User } from "discord.js";

export const injectPrototype = () => { }; // Turn this file into a module

declare global {
	interface Number {
		inRange: (a: number, b: number) => boolean;
	}

	interface Array<T> {
		unique: () => Array<T>;
	}

	interface BigInt {
		toJSON: () => string;
	}
}

Number.prototype.inRange = function (a: number, b: number) {
	return this.valueOf() > a && this.valueOf() < b;
};

// Prevent being read from loops 
// For example:
// for (let key in array) { ... }

Object.defineProperty(Array.prototype, "unique", {
	enumerable: false,
	writable: true
});

Array.prototype.unique = function () {
	return [...new Set(this)];
};

BigInt.prototype.toJSON = function () {
	return this.toString();
}

declare module "discord.js" {
	interface Message {
		getLocale: () => Languages;
	}

	interface Interaction {
		getLocale: () => Languages;
	}

	interface ContextMenuInteraction {
		getMessage: () => Message;
		getUser: () => User;
	}

	interface User {
		getLocale: () => Languages | null;
		setLocale: (language?: Languages) => void;
	}

	interface Channel {
		getLocale: () => Languages | null;
		setLocale: (language?: Languages) => void;
	}

	interface Guild {
		getLocale: () => Languages | null;
		setLocale: (language?: Languages) => void;
	}
}

Message.prototype.getLocale = function () {
	return this.channel.getLocale() ?? this.guild?.getLocale() ?? Languages.English;
};

Interaction.prototype.getLocale = function () {
	const locale: Languages | null = parseLocaleString(this.locale);

	return locale ?? this.user.getLocale() ?? this.channel?.getLocale() ?? this.guild?.getLocale() ?? Languages.English;
};

ContextMenuInteraction.prototype.getMessage = function () {
	return this.options.getMessage("message") as Message; // Assuming all messages received are Message-compactible.
};

ContextMenuInteraction.prototype.getUser = function () {
	return this.options.getUser("user") as User; // Assuming all messages received are Message-compactible.
};

User.prototype.getLocale = function () {
	return getLocale("user", this.id);
};

User.prototype.setLocale = function (language?) {
	setLocale("user", this.id, language);
};

Channel.prototype.getLocale = function () {
	return getLocale("channel", this.id);
};

Channel.prototype.setLocale = function (language?) {
	setLocale("channel", this.id, language);
};

Guild.prototype.getLocale = function () {
	return getLocale("guild", this.id) ?? parseLocaleString(this.preferredLocale);
};

Guild.prototype.setLocale = function (language?) {
	setLocale("guild", this.id, language);
};