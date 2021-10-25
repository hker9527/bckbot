import { Languages } from "@app/i18n";
import { Singleton } from "@app/Singleton";
import { sleep } from "@app/utils";
import { Dictionary } from "@type/Dictionary";
import { ArgumentRequirement, Module, ModuleActionArgument } from "@type/Module";
import { Message } from "discord.js";
const cld = require('cld');

const cleanUpAndDelete = async (message: Message) => {
	await message.reactions.removeAll();
	await sleep(5000);
	await message.delete();
};

const channelEmoji = "🇨";
const guildEmoji = "🇬";

const flags: Record<string, Languages> = {
	"🇺🇸": Languages.English,
	"🇭🇰": Languages.Cantonese,
	"🇹🇼": Languages.Taiwanese,
	"🇯🇵": Languages.Japanese
};

const isValidLanguage = (lang: string) => (<any>Object).values(Languages).includes(lang);

export const module: Module = {
	trigger: ["lang"],
	event: "messageCreate",
	argv: {
		"lang": [ArgumentRequirement.Optional]
	},
	action: async (obj: ModuleActionArgument) => {
		// TODO: Use action menu
		/*
			1. Detect language by channel history, or use language provided by user.
			2. if none works, provide menu for user.
			3. Show preview and ask to save settings to channel/guild.
		*/

		let language: string;

		if (obj.argv && obj.argv.lang) {
			language = obj.argv.lang;
		} else {
			const result: Dictionary<number> = {};

			const messages = await obj.message.channel.messages.fetch({ limit: 100 });
			for (const [_, message] of messages) {
				try {
					const txt = message.cleanContent.replace(/<.+?>/g, "");
					if (txt === "" || txt.startsWith("b!") || message.author.bot) continue;
					const _result = await cld.detect(txt);
					const code = (() => {
						switch (_result.languages[0].code) {
							case "zh-Hant":
								return Languages.Taiwanese;
							case "zh-Hans":
								return Languages.Taiwanese;
							default:
								return _result.languages[0].code;
						}
					})();
					result[code] ||= 0;
					result[code]++;
				} catch (e) { }
			}

			language = Object.keys(result).sort((a, b) => result[a] < result[b] ? 1 : -1)[0] ?? Languages.English;
		}

		let msg: Message;

		const askGuildOrChannel = async () => {
			const txt = `Do you want to apply the language ${language} to the whole guild or this channel?\n(The precedence of channel language will override the guild language.)`;
			if (msg) {
				msg = await msg.edit(txt);
			} else {
				msg = await obj.message.reply(txt);
			}

			await msg.reactions.removeAll();

			for (const emoji of [channelEmoji, guildEmoji]) {
				await msg.react(emoji);
			}

			const collector = msg.createReactionCollector({
				filter: (reaction, user) => {
					const flag1 = [channelEmoji, guildEmoji].includes(reaction.emoji.name!);
					const flag2 = user === obj.message.author;
					if (flag1 && !flag2 && user !== Singleton.client.user) reaction.remove();
					return flag1 && flag2;
				},
				time: 30000
			});
			collector.on('collect', async (reaction) => {
				try {
					switch (reaction.emoji.name) {
						case channelEmoji:
							obj.message.channel.setLocale(language as Languages);
							break;
						case guildEmoji:
							obj.message.guild!.setLocale(language as Languages);
							break;
					}
					await msg.edit("Settings saved.");
					await cleanUpAndDelete(msg);
				} catch (e) { }
			});

			collector.on("end", async () => {
				try {
					await msg.edit("Didn't receive response in time. Settings unchanged.");
					await cleanUpAndDelete(msg);
				} catch (e) { }
			});
			return msg;
		};

		if (!isValidLanguage(language)) {
			msg = await obj.message.reply(`The language ${language} is not currently supported.\nYou may select one of the supported languages below:\n`);

			const collector = msg.createReactionCollector({
				filter: (reaction, user) => {
					const flag1 = Object.keys(flags).includes(reaction.emoji.name!);
					const flag2 = user === obj.message.author;
					if (flag1 && !flag2 && user !== Singleton.client.user) reaction.remove();
					return flag1 && flag2;
				},
				time: 30000
			});
			collector.on('collect', async (reaction) => {
				try {
					collector.stop("collect");
					language = flags[reaction.emoji.name!];
					await askGuildOrChannel();
					await cleanUpAndDelete(msg);
				} catch (e) { }
			});

			collector.on("end", async (collected, reason) => {
				try {
					if (reason === "collect") return;
					await msg.edit("Didn't receive response in time. Settings unchanged.");
					await cleanUpAndDelete(msg);
				} catch (e) { }
			});

			for (const flag in flags) {
				await msg.react(flag);
			}

			return msg;
		}

		return await askGuildOrChannel();
	}
};