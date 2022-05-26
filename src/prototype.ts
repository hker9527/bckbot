import { Message, Guild, Interaction, ContextMenuInteraction, User } from "discord.js";
import { LocaleString } from "discord-api-types/v9";

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
		getLocale: () => LocaleString;
	}

	interface Interaction {
		getLocale: () => LocaleString;
	}

	interface ContextMenuInteraction {
		getMessage: () => Message;
		getUser: () => User;
	}

	interface Guild {
		getLocale: () => LocaleString;
	}
}

Message.prototype.getLocale = function () {
	return this.guild?.getLocale() ?? "en-US";
};

Interaction.prototype.getLocale = function () {
	// Fallbacks for similar languages
	switch (this.locale) {
		case "en-GB":
			return "en-US";
		case "zh-CN":
			return "zh-TW";
		default:
			return this.locale as LocaleString ?? this.guild?.getLocale() ?? "en-US";
	}
};

ContextMenuInteraction.prototype.getMessage = function () {
	return this.options.getMessage("message") as Message; // Assuming all messages received are Message-compactible.
};

ContextMenuInteraction.prototype.getUser = function () {
	return this.options.getUser("user") as User; // Assuming all messages received are Message-compactible.
};

Guild.prototype.getLocale = function () {
	return this.preferredLocale as LocaleString;
};