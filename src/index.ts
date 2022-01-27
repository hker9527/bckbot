import "module-alias/register";
import "source-map-support/register";

import { injectPrototype } from "@app/prototype";
import { Singleton } from "@app/Singleton";
import { Dictionary } from "@type/Dictionary";
import { SlashCommandResult } from "@type/SlashCommand/result";
import { StealthModule, StealthModuleActionArgument } from "@type/StealthModule";
import { exec } from "child_process";
import { CommandInteraction, ContextMenuInteraction, InteractionReplyOptions, Message, MessageComponentInteraction, MessageInteraction } from "discord.js";
import { config } from "dotenv-safe";
import glob from "glob";
import { APISlashCommandAdapter } from "./adapters/APISlashCommand";
import { i18init, Languages } from "./i18n";
import { msg2str, report } from "./utils";
import { StealthModuleResult } from "@type/StealthModule/result";
import { Localizer } from "./localizers";
import { Command, ContextMenuCommand, SlashCommand } from "@type/SlashCommand";
import { Report } from "./reporting";
import { assert } from "assert-ts";

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

	client.on("ready", () => {
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
							const options = new StealthModuleResult(result.result, message.id).localize(message.getLocale()).build();
							const msg = result.type === "reply" ? await message.reply(options) : await message.channel.send(options);
							stealthMessageData[message.id] = {
								replyID: msg.id,
								authorID: message.author.id
							};

							setTimeout(async () => {
								try {
									delete stealthMessageData[message.id];
									assert(options.components !== undefined);
									const lastRow = options.components[options.components.length - 1];
									const lastComponent = lastRow.components[lastRow.components.length - 1];
									assert("customId" in lastComponent && lastComponent.customId!.startsWith("delete"))
									lastRow.components.pop();
									// Check if empty last row
									if (lastRow.components.length === 0) {
										options.components.pop();
									}
			
									await msg.edit(options);
								} catch (e) {
									Report.error(e, "Error deleting delete button");
								}
							}, 1000 * 60 * 5);
						}
					} catch (e) {
						if (e instanceof Error) await Report.error(e, msg2str(message));
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

			const setRemoveDeleteButtonListener = (options: InteractionReplyOptions) => {
				const _interaction = interaction as MessageComponentInteraction | CommandInteraction | ContextMenuInteraction;

				interactions[_interaction.id] = _interaction;
				setTimeout(async () => {
					try {
						delete interactions[_interaction.id];
						assert(options.components !== undefined);
						const lastRow = options.components[options.components.length - 1];
						const lastComponent = lastRow.components[lastRow.components.length - 1];
						assert("customId" in lastComponent && lastComponent.customId!.startsWith("delete"))
						lastRow.components.pop();
						// Check if empty last row
						if (lastRow.components.length === 0) {
							options.components.pop();
						}

						await _interaction.editReply(options);
					} catch (e) {
						Report.error(e, "Error deleting delete button");
					}
				}, 1000 * 60 * 5);
			};

			const sendOptions = async (options: InteractionReplyOptions) => {
				if (interaction.isMessageComponent()) {
					await interaction.editReply(options);
					setRemoveDeleteButtonListener(options);
				} else if (interaction.isCommand() || interaction.isContextMenu()) {
					if (command.defer) {
						await interaction.editReply(options);
					} else {
						await interaction.reply(options);
					}
					setRemoveDeleteButtonListener(options);
				}
			};

			// Post-processing (Add delete button etc) and send it
			const sendResult = async () => {
				try {
					assert(result);
					const options = new SlashCommandResult(result!, interaction.id).localize(interaction.getLocale()).build();
					await sendOptions(options);
				} catch (e) {
					let messageLink = `https://discord.com/channels/${interaction.guildId}/${interaction.channelId}`;
					if (interaction.isMessageComponent()) {
						messageLink += `/${interaction.message.id}`;	
					} else if (interaction.isContextMenu()) {
						if (interaction.targetType === "MESSAGE") 
							messageLink += `/${interaction.targetId}`;
					}

					Report.error(e as Error, `Interaction: \`\`\`json\n${JSON.stringify(interaction.toJSON(), null, 2)}\`\`\`\nLink: ${messageLink}`);

					const options = new SlashCommandResult({
						key: "index.error"
					}, interaction.id).localize(interaction.getLocale()).build();

					await sendOptions(options);
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
					Report.error(e, `Failed to delete ${interaction.customId[6] === "m" ? "message" : "interaction"}`);
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

			Report.info(`Unknown ${interaction.type} interaction received: \`\`\`json\n${JSON.stringify(interaction, null, 2)}\``);
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
