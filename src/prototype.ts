import { Message } from "discord.js";
import { Languages } from "@app/i18n";
import { Singleton } from "@app/Singleton";

export {}; // Turn this file into a module

declare global {
	interface Number {
		inRange(a: number, b: number): boolean;
	}

	interface Array<T> {
		unique(): Array<T>;
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
}

declare module "discord.js" {
	interface Message {
		getLocale(): Languages;
	}
}

Message.prototype.getLocale = function () {
	const data = Singleton.db.data!;
	if (data.language.channels[this.channelId]) {
		return data.language.channels[this.channelId];
	} else if (this.guildId && data.language.guilds[this.guildId]) {
		return data.language.guilds[this.guildId];
	}
	return Languages.English;
};