import { report } from "@app/utils";
import { Dictionary } from "@type/Dictionary";
import Discord, { Client, GuildChannel, TextChannel, ThreadChannel } from "discord.js";
import Vorpal from "vorpal";

export const Singleton: {
	logger: Vorpal,
	client: Client
} = {
	logger: (() => {
		const logger = new Vorpal();

		const guilds: Dictionary<Dictionary<GuildChannel | ThreadChannel>> = {};
		logger.command("ch", "Show channels.").action(async () => {
			for (const [, guild] of Singleton.client.guilds.cache) {
				logger.log(guild.id + ":\t" + guild.name);
				guilds[guild.id] = {};
				const channels = guild.channels.cache.filter((channel) => {
					return channel.isText();
				});
				for (const [, channel] of channels) {
					logger.log("\t" + channel.id + ":\t" + channel.name);
					guilds[guild.id][channel.id] = channel;
				}
			}
		});

		logger
			.command("send [chid] [msg...]", "Send message.")
			.autocomplete({
				data: async () => Object.values(guilds).map((a) => Object.keys(a)).flat()
			})
			.action(async (data) => {
				const channel = Singleton.client.channels.cache.find((_ch) => _ch.id === data.chid) as TextChannel;
				if (channel) {
					await channel.send(data.msg.join(" "));
				} else {
					logger.log("Channel does not exist!");
				}
			})
			.alias("say");

		logger.find("exit").remove();
		logger
			.command("exit", "Stop server.")
			.action(async () => {
				Singleton.client.destroy();
				report("Bot closed.");
				process.exit();
			})
			.alias("quit");

		(logger as any)
			.mode("eval")
			.delimiter("<eval>")
			.description("Enter evaluation mode.")
			.init(async () => {
				logger.log("You are now in evaluation mode.\n Type `exit` to exit.");
			})
			.action(async (a: Vorpal.Args) => {
				try {
					logger.log(eval(String(a)));
				} catch (e) {
					if (e instanceof Error)
						logger.log(e.toString());
				}
			});

		return logger;
	})(),
	client: new Discord.Client({
		intents: [
			Discord.Intents.FLAGS.GUILDS,
			Discord.Intents.FLAGS.GUILD_MESSAGES,
			Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
			Discord.Intents.FLAGS.DIRECT_MESSAGES,
			Discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
		]
	})
};