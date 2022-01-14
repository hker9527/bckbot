import "module-alias/register";

import { injectPrototype } from "@app/prototype";
import { Singleton } from "@app/Singleton";
import { Dictionary } from "@type/Dictionary";
import { SlashCommandResult } from "@type/SlashCommand/result";
import { StealthModule, StealthModuleActionArgument } from "@type/StealthModule";
import { exec } from "child_process";
import { CommandInteraction, ContextMenuInteraction, Message, MessageComponentInteraction, MessageInteraction } from "discord.js";
import { config } from "dotenv-safe";
import glob from "glob";
import { APISlashCommandAdapter } from "./adapters/APISlashCommand";
import { i18init, Languages } from "./i18n";
import { pmError, report } from "./utils";
import { StealthModuleResult } from "@type/StealthModule/result";
import { Localizer } from "./localizers";
import { Command, ContextMenuCommand, SlashCommand } from "@type/SlashCommand";

try {
	config();
	injectPrototype();
	i18init();

	const { client } = Singleton;

	const startTime = new Date();
	const eventModules: Record<
		StealthModule["event"],
		Dictionary<{
			module: StealthModule,
			loaded: boolean
		}>
	> = {
		"messageCreate": {},
		"messageDelete": {},
		"messageUpdate": {}
	};

	const slashCommands: (SlashCommand | ContextMenuCommand)[] = [];

	client.on("ready", async () => {
		Singleton.logger.delimiter("> ").show();

		exec("git show -s --format=\"v.%h on %aI\"", (error, string) => {
			if (error) {
				report(error.message);
			} else {
				client.user!.setActivity(string, {
					type: "WATCHING"
				});
			}
		});

		for (const [event, modules] of Object.entries(eventModules)) {
			// Pre-processing (init, interval)
			for (let moduleName of Object.keys(modules)) {
				const _module = modules[moduleName];
				const module = _module.module;

				if (module.init) {
					try {
						// Parallel loading
						(async () => {
							await module.init!();
							_module.loaded = true;
						})();
					} catch (e) {
						if (e instanceof Error)
							report(`Init failed for module ${moduleName}: ${e.message}`);
					}
				} else {
					_module.loaded = true;
				}

				if (module.interval) {
					const f = async () => {
						try {
							await module.interval!.f();
							setTimeout(f, module.interval!.t);
						} catch (e) {
							if (e instanceof Error)
								report(`Interval failed for module ${moduleName}: ${e.message}`);
						}
					};
					setTimeout(f, module.interval.t);
				}
			}

			// Build listeners
			client.on(event, async (message: Message) => {
				if (message.channel.id === process.env.error_chid || message.author === client.user) return;

				for (const moduleName in modules) {
					try {
						const _module = modules[moduleName];
						const module = _module.module;

						if (!_module.loaded) continue;
						let matches: RegExpMatchArray | undefined;
						if (module.pattern) {
							matches = message.content.match(module.pattern) || undefined;
							if (!matches) continue;
						}

						const argv: StealthModuleActionArgument = {
							message,
							matches
						};

						if (module.eval) {
							argv.eval = {};
							for (const name in module.eval) {
								argv.eval[name] = eval(module.eval[name]);
							}
						}

						const result = await module.action(argv);
						if (typeof result !== "boolean") {
							// await createDeleteAction(message);
							const option = new StealthModuleResult(result.result, message.id).localize(message.getLocale()).build();
							const msg = result.type === "reply" ? await message.reply(option) : await message.channel.send(option);
							stealthMessageData[message.id] = {
								replyID: msg.id,
								authorID: message.author.id
							};
						}
					} catch (e) {
						if (e instanceof Error) await pmError(message, e);
					}
				}
				return;
			});
		}

		const APICommands: Dictionary<SlashCommand | ContextMenuCommand> = {};
		const guildRegistered: Dictionary<boolean> = {};

		// Application Command registration
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const [_, guild] of client.guilds.cache) {
			const guildLocale = guild.getLocale() ?? Languages.English;

			const worker = async () => {
				if (guildRegistered[guild.id]) return;

				try {
					await guild.commands.fetch(); // Check for permissions
				} catch (e) {
					guildRegistered[guild.id] = false;
					setTimeout(worker, 1000 * 60 * 5);
					return;
				}

				/*
					The original module may look like:
					{
						name: {
							key: "avatar.name",
							value: { hello: "world" }
						}	
					}
					The registered module would contain the *localized* version of the command name, like:
					{
						name: "Command world"
					}

					A simple lookup can yield the original slash command.
				*/

				const commands = await guild.commands.set(slashCommands.map(slashCommand => APISlashCommandAdapter(slashCommand, guildLocale)));
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				for (const [_, command] of commands) {
					APICommands[command.id] = slashCommands.find(_command => command.name === Localizer(_command.name, guildLocale))!;
				}

				guildRegistered[guild.id] = true;
			};

			worker();
		}

		const stealthMessageData: Dictionary<{
			replyID: string;
			authorID: string;
		}> = {};
		// Save all interactions for delete button
		const interactions: Dictionary<MessageComponentInteraction | CommandInteraction | ContextMenuInteraction> = {};

		client.on("interactionCreate", async (interaction) => {
			let result: ConstructorParameters<typeof SlashCommandResult>["0"] | null = null;
			let command: Command;

			// Post-processing (Add delete button etc) and send it
			const sendResult = async () => {
				if (result) {
					const after = () => {
						const _interaction = interaction as MessageComponentInteraction | CommandInteraction | ContextMenuInteraction;

						interactions[_interaction.id] = _interaction;
						setTimeout(async () => {
							try {
								delete interactions[_interaction.id];
								options.components!.pop();
								await _interaction.editReply(options);
							} catch (e) {
								// Nothing
							}
						}, 1000 * 60 * 5);
					};

					const options = new SlashCommandResult(result, interaction.id).localize(interaction.getLocale()).build();

					if (interaction.isMessageComponent()) {
						await interaction.editReply(options);
						after();
					} else if (interaction.isCommand() || interaction.isContextMenu()) {
						if (command.defer) {
							await interaction.editReply(options);
						} else {
							await interaction.reply(options);
						}
						after();
					}
				}
			};

			// Delete button
			if (interaction.isButton() && interaction.customId.startsWith("delete")) {
				const reject = async () => {
					await interaction.reply({
						content: Localizer({
							key: "index.deletingOthersMessage"
						}, interaction.getLocale()),
						ephemeral: true
					});
				};

				try {
					const id = interaction.customId.substring(7);
					switch (interaction.customId[6]) {
						case "m":
							const reply = await interaction.channel?.messages.fetch(stealthMessageData[id].replyID);

							if (reply) {
								if (interaction.user.id === stealthMessageData[id].authorID || interaction.memberPermissions?.has("ADMINISTRATOR"))
									await reply.delete();
								else
									await reject();
							}
							break;
						case "i":
							const originalInteraction = interactions[id];
							if (originalInteraction) {
								if (interaction.user === originalInteraction.user || interaction.memberPermissions?.has("ADMINISTRATOR"))
									await originalInteraction.deleteReply();
								else
									await reject();
							}
							break;
					}
				} catch (e) {
					// Nothing
				}

				return;
			}

			if (interaction.isCommand() || interaction.isContextMenu()) {
				// Lookup by id
				command = APICommands[interaction.commandId];
				if (command) {
					if (command.defer)
						await interaction.deferReply();

					if (interaction.isCommand() && "onCommand" in command) {
						result = await (command as SlashCommand).onCommand(interaction);
					} else if (interaction.isContextMenu() && "onContextMenu" in command) {
						result = await (command as ContextMenuCommand).onContextMenu(interaction);
					}

					if (result) return await sendResult();
				}
			} else if (interaction.isMessageComponent()) {
				// Lookup by source message's interaction's name
				command = slashCommands.find(_command =>
					Localizer(_command.name, interaction.guild?.getLocale() ?? Languages.English) === (interaction.message!.interaction! as MessageInteraction).commandName
				)!;
				if (command) {
					if (command.defer)
						await interaction.deferUpdate();

					if (interaction.isButton() && command.onButton) {
						result = await command.onButton(interaction);
					} else if (interaction.isMessageComponent() && command.onMessageComponent) {
						result = await command.onMessageComponent(interaction);
					} else if (interaction.isSelectMenu() && command.onSelectMenu) {
						result = await command.onSelectMenu(interaction);
					}

					if (result) return await sendResult();
				}
			}

			report(`Unknown ${interaction.type} interaction received: ${JSON.stringify(interaction, null, 4)}`);
		});

		report(`Finished loading in ${+new Date() - +startTime}ms`);
	});

	// Init
	glob("./bin/modules/**/*.js", async (error, fileList) => {
		if (error) throw error;
		for (let file of fileList.filter((_file) => {
			// Don't load modules starting with _
			return _file.split("/").pop()![0] !== "_";
		})) {
			const fileName = file.split("/").pop()!;
			const moduleName = fileName.slice(0, -3);

			const __module = await import(`@app/${file.slice(6)}`);
			const _module = __module.module;
			let tmp: StealthModule | SlashCommand | ContextMenuCommand;
			if ("action" in _module) {
				tmp = _module as StealthModule;
				eventModules[tmp.event][moduleName] = {
					module: tmp,
					loaded: false
				};
			} else if ("name" in _module) {
				tmp = _module as SlashCommand | ContextMenuCommand;
				slashCommands.push(tmp);
			} else {
				report(`Unknown module ${fileName}!`);
				process.exit();
			}

			report(`Loaded module ${fileName}`);
		}

		await client.login(process.env.bot_token);
		report("Logged in as " + client.user!.tag);
	});
} catch (e) {
	if (e instanceof Error)
		report("Error occurred: " + e.toString());
}
