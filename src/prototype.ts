import { Languages } from '@app/i18n';
import { Singleton } from '@app/Singleton';
import { Message, Channel, Guild, Interaction } from 'discord.js';

export const injectPrototype = () => {}; // Turn this file into a module

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

	interface Interaction {
		getLocale(): Languages;
	}

	interface Channel {
		getLocale(): Languages;
		setLocale(language: Languages): void;
	}

	interface Guild {
		getLocale(): Languages;
		setLocale(language: Languages): void;
	}
}

Message.prototype.getLocale = function () {
	return this.channel.getLocale() ?? this.guild?.getLocale() ?? Languages.English;
};

Interaction.prototype.getLocale = function () {
	return this.channel?.getLocale() ?? this.guild?.getLocale() ?? Languages.English;
};

Channel.prototype.getLocale = function () {
	return Singleton.db.data!.language.channels[this.id];
};

Channel.prototype.setLocale = function (language) {
	Singleton.db.data!.language.channels[this.id] = language;
}

Guild.prototype.getLocale = function () {
	return Singleton.db.data!.language.guilds[this.id];
};

Guild.prototype.setLocale = function (language) {
	Singleton.db.data!.language.guilds[this.id] = language;
}