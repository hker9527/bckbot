import "module-alias/register";
import { Message } from "discord.js";
import vorpal from "vorpal";
import glob from "glob";
import * as utils from "@app/modules/_utils";
import dotenvSafe from "dotenv-safe";
import { Singleton } from "./modules/_Singleton";
import * as i18n from "./modules/i18n";
import { Events } from "./types/Events";
import { ArgumentRequirement, Module, ModuleActionArgument } from "./types/Module";
import { Dictionary } from "./types/Dictionary";

dotenvSafe.config();

const { logger, client } = Singleton;

try {
	const startTime = new Date();
	const events = ["messageCreate", "messageDelete", "messageUpdate"];
	const eventModules: Events = utils.arr2obj(
		events,
		events.map((e) => {
			return {};
		})
	);

	client.on("ready", async () => {
		logger.delimiter("> ").show();

		for (let event of events) {
			// Pre-processing (init, interval)
			for (let moduleName of Object.keys(eventModules[event])) {
				const _module = eventModules[event][moduleName];
				const module = _module.module;
				let baseArgv: Dictionary<any> = {};

				if (module.init) {
					try {
						// Parallel loading
						(async () => {
							await module.init!(baseArgv);
							_module.loaded = true;
						})();
					} catch (e) {
						if (e instanceof Error)
							utils.report(
								`Init failed for module ${moduleName}: ${e.message}`
							);
					}
				} else {
					_module.loaded = true;
				}

				if (module.interval) {
					const f = async () => {
						try {
							await module.interval!.f(baseArgv);
							setTimeout(f, module.interval!.t);
						} catch (e) {
							if (e instanceof Error)
								utils.report(
									`Interval failed for module ${moduleName}: ${e.message}`
								);
						}
					};
					setTimeout(f, module.interval.t);
				}
			}
			// Build listener
			client.on(event, async (message: Message) => {
				if (message.channel.id === process.env.error_chid || message.author === client.user) return;
				if (event === "message" && message.channel.isText()) utils.report(utils.msg2str(message));

				let accepted = false,
					stealthExists = false,
					result;
				const messageArgs = message.content.split(" ");
				const messageTrigger = messageArgs[0].substr(2);

				for (let _module of Object.values(eventModules[event])) {
					const module = _module.module;
					for (let trigger of module.trigger) {
						const stealth = trigger.startsWith("*");
						stealthExists = stealthExists || stealth;

						if (trigger === messageTrigger || stealth) {
							try {
								if (!_module.loaded) {
									await message.reply(
										await i18n.getString(
											"index",
											"stillLoading",
											i18n.Languages.English
										)
									);
									return;
								}
								let moduleActionArgument: ModuleActionArgument = {
									trigger,
									message,
								};

								if (module.argv) {
									moduleActionArgument.argv = {};
									const argNames = Object.keys(module.argv);
									// Check message argv requirements
									for (let i = 0; i < argNames.length; i++) {
										const argName = argNames[i];
										const argValue = messageArgs[i + 1]; // The first one is trigger
										if (
											module.argv[argName].includes(
												ArgumentRequirement.Required
											) &&
											typeof argValue === "undefined"
										) {
											await message.reply(
												await i18n.getString(
													"index",
													"argvError",
													i18n.Languages.English,
													{
														argName,
														position: i,
														trigger,
														usage: argNames
															.map((arg) => {
																const flagOptional =
																	module.argv![
																		arg
																	].includes(
																		ArgumentRequirement.Required
																	);
																const flagConcat =
																	module.argv![
																		arg
																	].includes(
																		ArgumentRequirement.Concat
																	);
																return `${flagOptional
																	? "["
																	: ""
																	}${flagConcat
																		? "..."
																		: ""
																	}${arg}${flagOptional
																		? "]"
																		: ""
																	}`;
															})
															.join(" "),
													}
												)
											);
											return;
										}
										if (argValue && argValue.length)
											moduleActionArgument.argv[argName] =
												module.argv[argName].includes(
													ArgumentRequirement.Concat
												)
													? messageArgs
														.slice(i + 1)
														.join(" ")
													: argValue;
									}
								}

								if (module.eval) {
									moduleActionArgument.eval = {};
									for (const name in module.eval) {
										moduleActionArgument.eval[name] = eval(module.eval[name]);
									}
								}

								result = await module.action(moduleActionArgument);
								if (result instanceof Message) {
									const msg = result as Message;
									const collector = msg.createReactionCollector({
										filter: (reaction, user) => {
											const flag1 = reaction.emoji.name === '🗑️';
											const flag2 = user === message.author;
											if (flag1 && !flag2 && user !== client.user) reaction.remove();
											return flag1 && flag2;
										},
										time: 15000
									});
									collector.on('collect', async () => {
										try {
											await msg.delete();
										} catch (e) { }
									});
									const reaction = await msg.react('🗑️');
									collector.on('end', async () => {
										try {
											await reaction.remove();
										} catch (e) { }
									});
								}
								if (!stealth) accepted = true;
							} catch (e) {
								if (!stealth) await message.react("❌");
								if (e instanceof Error) await utils.pmError(message, e);
							}
						}
					}
				}
				if (!accepted && message.content.startsWith("b!") && stealthExists) {
					await message.react(
						client.emojis.cache.random()
					);
					return;
				} else {
					return;
				}
			});
		}
		utils.report(`Finished loading in ${+new Date() - +startTime}ms`);
	});

	glob("./bin/modules/**/*.js", async (error, fileList) => {
		if (error) throw error;
		for (let file of fileList.filter((_file) => {
			return _file.split("/").pop()![0] != "_" && !_file.includes("i18n");
		})) {
			const fileName = file.split("/").pop()!;
			const tmp = require(`@app/${file.slice(6)}`).module as Module;
			eventModules[tmp.event][fileName.slice(0, -3)] = {
				module: tmp,
				loaded: false,
			};
			utils.report(`Loaded module ${fileName}`);
		}

		await client.login(
			process.argv[2] === "dev"
				? process.env.dev_token
				: process.env.bot_token
		);
		utils.report("Logged in as " + client.user!.tag);
	});
} catch (e) {
	if (e instanceof Error)
		utils.report("Error occurred: " + e.toString());
}
