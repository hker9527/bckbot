import { assert } from "console"
import { TextChannel } from "discord.js";
import { Singleton } from "./Singleton";

let inited = false;
let channel: TextChannel;

const init = async () => {
	if (inited) return;
	assert(Singleton.client.user !== null);
	channel = await Singleton.client.channels.fetch(`${BigInt(process.env.error_chid!)}`) as TextChannel;
	inited = true;
};

const _send = async (o: Parameters<TextChannel["send"]>["0"]) => {
	await init();
	return await channel.send(o);
};

const stack2txt = (stack: Error["stack"]) => {
	return ("```\n" + (stack ?? "(undefined)") + "\n```").substring(0, 1990);
};

const info = async (txt: string) => {
	return await _send({
		embeds: [{
			title: "Info",
			fields: [
				{
					name: "Message",
					value: txt
				},
				{
					name: "Stacktrace",
					value: stack2txt(new Error().stack)
				}
			],
			color: "AQUA"
		}]
	});
};

const error = async (_error: unknown, message?: string) => {
	const error = _error instanceof Error ? _error : new Error(_error as string);
	return await _send({
		embeds: [{
			title: "Error",
			fields: [
				{
					name: "Message",
					value: message ?? error.message
				}, 
				{
					name: "Stacktrace",
					value: stack2txt(error.stack)
				}
			],
			color: "DARK_RED"
		}]
	});
};

export const Report = {
	send: _send,
	info,
	error
};