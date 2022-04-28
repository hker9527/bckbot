import { Singleton } from "@app/Singleton";
import { Dictionary } from "@type/Dictionary";
import assert from "assert";
import { Decimal } from "decimal.js";
import { DMChannel, Message, TextChannel } from "discord.js";
import fetch from "node-fetch";
import { ZodType } from "zod";

export const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export const timeFormat = () => {
	return new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
};

export const round = (number: number, precision = 2) => {
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
		assert(sumProb.toString() === "1", `sumProb != 1, got ${sumProb}`);

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

export const parseArgv = (text: string, delimiter = " ") => {
	return text.split(delimiter).filter((a) => { return a.length; });
};

export const extArgv = (message: Message, clean = false) => {
	let t = clean ? message.cleanContent : message.content;
	return t.split(" ").slice(1).join(" ");
};

export const _req = async (url: string, json = false) => {
	const response = await fetch(url);
	return await (json ? response.json() : response.text());
};

export const req2json = async (url: string) => {
	return await _req(url, true);
};

export const enumStringKeys = <T>(e: T) => {
	return Object.keys(e).filter(value => isNaN(Number(value))) as (keyof T)[];
};

export const isZod = <T>(o: unknown, z: ZodType<T>): o is T => {
	return z.safeParse(o).success;
};