import * as utils from '@app/utils';
import { Database } from '@type/Database';
import { Dictionary } from '@type/Dictionary';
import Discord, { Client, GuildChannel, TextChannel, ThreadChannel } from 'discord.js';
import { JSONFileSync, LowSync } from 'lowdb';
import Osu from 'osu.ts';
import Vorpal from 'vorpal';

export const Singleton: {
	logger: Vorpal,
	client: Client,
	osuClient: Osu,
	db: LowSync<Database>
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
				data: async () => {
					return Object.values(guilds)
						.map((a) => Object.keys(a))
						.flat();
				},
			})
			.action(async (data) => {
				const channel = Singleton.client.channels.cache.find(
					(_ch) => _ch.id == data.chid
				) as TextChannel;
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
				utils.report("Bot closed.");
				process.exit();
			})
			.alias("quit");
		
		(logger as any)
			.mode("eval")
			.delimiter("<eval>")
			.description("Enter evaluation mode.")
			.init(async (a: any) => {
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
		],
	}),
	osuClient: new Osu(process.env.osu_api!),
	db: (() => {
		const adapter = new JSONFileSync<Database>("db.json");
		const db = new LowSync<Database>(adapter);

		// Read from disk
		db.read();

		// Set default value
		db.data ||= {
			language: {
				guilds: {},
				channels: {}
			},
			osuLink: {}
		};

		// Sync worker
		let _data = JSON.stringify(db.data);
		setInterval(() => {
			const data = JSON.stringify(db.data);
			if (_data !== data) {
				db.write();
				_data = data;
			}
		}, 5000);

		return db;
	})()
};