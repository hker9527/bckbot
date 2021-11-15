import { Languages } from '@app/i18n';
import { Singleton } from '@app/Singleton';
import { Message, Channel, Guild, Interaction, ContextMenuInteraction, User } from 'discord.js';

export const injectPrototype = () => { }; // Turn this file into a module

declare global {
	interface Number {
		inRange(a: number, b: number): boolean;
	}

	interface Array<T> {
		unique(): Array<T>;
	}

	interface BigInt {
		toJSON(): string
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
		getLocale(): Languages;
	}

	interface Interaction {
		getLocale(): Languages;
	}

	interface ContextMenuInteraction {
		getMessage(): Message;
		getUser(): User;
	}

	interface Channel {
		getLocale(): Languages;
		setLocale(language?: Languages): void;
	}

	interface Guild {
		getLocale(): Languages;
		setLocale(language?: Languages): void;
	}
}

Message.prototype.getLocale = function () {
	return this.channel.getLocale() ?? this.guild?.getLocale() ?? Languages.English;
};

Interaction.prototype.getLocale = function () {
	return this.channel?.getLocale() ?? this.guild?.getLocale() ?? Languages.English;
};

ContextMenuInteraction.prototype.getMessage = function () {
	return this.options.getMessage('message') as Message; // Assuming all messages received are Message-compactible.
};

ContextMenuInteraction.prototype.getUser = function () {
	return this.options.getUser('user') as User; // Assuming all messages received are Message-compactible.
};

Channel.prototype.getLocale = function () {
	return Singleton.db.data!.language.channels[this.id];
};

Channel.prototype.setLocale = function (language?) {
	if (language) {
		Singleton.db.data!.language.channels[this.id] = language;
	} else {
		delete Singleton.db.data!.language.channels[this.id];
	}
};

Guild.prototype.getLocale = function () {
	return Singleton.db.data!.language.guilds[this.id];
};

Guild.prototype.setLocale = function (language?) {
	if (language) {
		Singleton.db.data!.language.guilds[this.id] = language;
	} else {
		delete Singleton.db.data!.language.guilds[this.id];
	}
};