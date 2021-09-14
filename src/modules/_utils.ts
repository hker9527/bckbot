import assert from "assert";
import { DMChannel, Message, TextChannel } from "discord.js";
import { Dictionary } from "../types/Dictionary";
import { Singleton } from './_Singleton';
import { Decimal } from "decimal.js";
import fetch from 'node-fetch';
import { Languages } from "./i18n";

export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const timeFormat = () => {
	return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
};

export const round = (number: number, precision: number = 2) => {
	return parseFloat(new Decimal(number).toFixed(precision));
};

export const msg2str = (message: Message) => {
	return [
		(message.guild ? message.guild.name : "PrivateMessage") +
		(message.channel instanceof DMChannel ? "" : `(${(message.channel as TextChannel).name})`),
		"\t",
		message.author.username,
		": ",
		`"${message.cleanContent}"`,
		(message.attachments.size ? ` [${message.attachments.size}]` : "")
	].join("");
};

export const report = (string: string) => {
	Singleton.logger.log(`${timeFormat()}\t${string}`);
};

export const isValid = (variable: any) => {
	return !(typeof variable == "undefined");
};

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

export const random = (low: number, high: number) => {
	if (low === high) return low;
	return Math.floor(Math.random() * (high - low + 1) + low);
};

export const arr2obj = <T>(a1: (string | number)[], a2: T[]): Dictionary<T> => {
	assert(a1.length === a2.length);
	const out: Dictionary<T> = {};
	for (let i = 0; i < a1.length; i++) {
		out[a1[i]] = a2[i];
	}
	return out;
};

export const urandom = (object: Dictionary<Decimal | number>) => {
	const opt = Object.keys(object);

	if (opt.length === 1) {
		return opt[0];
	} else {
		const rand = Math.random();
		let sumProb = new Decimal(0);
		for (const prob of Object.values(object)) {
			sumProb = sumProb.add(new Decimal(prob));
		}
		assert(sumProb.toString() === '1', `sumProb != 1, got ${sumProb}`);

		sumProb.minus(object[opt[opt.length - 1]]);

		for (let i = opt.length - 1; i > 0; i--) {
			if (sumProb.lessThan(rand)) {
				return opt[i];
			} else {
				sumProb = sumProb.minus(object[opt[i - 1]]);
			}
		}

		return opt.shift()!;
	}
};

export const randomString = (length: number) => {
	let o = "";
	for (let i = 0; i < Math.ceil(length / 8); i++) {
		o = o + Math.random().toString(36).substr(2, 8);
	}
	return o.substr(0, length);
};

export const randomArrayElement = <T>(array: Array<T>) => {
	return array.length === 1 ? array[0] : array[random(0, array.length - 1)];
};

export const parseArgv = (text: string, delimiter: string = " ") => {
	return text.split(delimiter).filter((a) => { return a.length; });
};

export const extArgv = (message: Message, clean: boolean = false) => {
	let t = clean ? message.cleanContent : message.content;
	return t.split(" ").slice(1).join(" ");
};

export const _req = async (url: string, json: boolean = false) => {
	const response = await fetch(url);
	return await (json ? response.json() : response.text());
};

export const req2json = async (url: string) => {
	return _req(url, true);
};

export const pm = async (text: string) => {
	assert(Singleton.client);
	return (await Singleton.client!.channels.fetch(`${BigInt(process.env.error_chid!)}`) as TextChannel)!.send(text);
};

export const pmError = async (message: Message, error: Error) => {
	const txt = [
		"Original message =\t`" + msg2str(message) + "`",
		"Error stack = ",
		"```",
		error.stack
	].join("\n").substr(0, 1997) + "```";

	report(txt);
	return pm(txt);
};

export const rod = function (value: number, max = 100, length = 10) {
	let pv = new Decimal(max).dividedBy(length);
	return ("█".repeat(value <= 0 ? 0 : new Decimal(value).dividedBy(pv).floor().toNumber()) +
		"▓".repeat(value <= 0 ? 0 : new Decimal(length - (max - value)).dividedBy(pv).mod(1).toNumber() >= 0.5 ? 1 : 0) +
		"▒".repeat(value <= 0 ? 0 : new Decimal(length - (max - value)).dividedBy(pv).mod(1).toNumber() < 0.5 ? 1 : 0) +
		"░".repeat(value <= 0 ? length : new Decimal(max - value).dividedBy(pv).add(0.5).floor().toNumber())
	).substr(0, length);
};
export const enumStringKeys = (e: any) => {
	return Object.keys(e).filter(value => isNaN(Number(value)));
};