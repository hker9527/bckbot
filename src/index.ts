import 'module-alias/register';

import { injectPrototype } from '@app/prototype';
import { Singleton } from '@app/Singleton';
import { Dictionary } from '@type/Dictionary';
import { Events } from '@type/Events';
import { ContextMenuCommand, SlashCommand, SlashCommandResult } from '@type/slashCommand';
import { MessageComponentButton } from '@type/slashCommand/MessageComponents';
import { StealthModule, StealthModuleActionArgument } from '@type/StealthModule';
import { exec } from "child_process";
import { BaseCommandInteraction, Message, MessageInteraction, User } from 'discord.js';
import { config } from "dotenv-safe";
import glob from 'glob';
import { APISlashCommandAdapter } from './adapters/APISlashCommand';
import { InteractionReplyOptionsAdapter } from './adapters/InteractionReplyOptions';
import { SlashCommandResultAdapter } from './adapters/SlashCommandResult';
import { getString, i18init } from "./i18n";
import { arr2obj, pmError, report } from './utils';

config();
injectPrototype();
i18init();

const { logger, client } = Singleton;

try {
	const startTime = new Date();
	const events = ["messageCreate", "messageDelete", "messageUpdate"];
	const eventModules: Events = arr2obj(
		events,
		events.map(() => ({}))
	);
	const slashCommands: Dictionary<SlashCommand | ContextMenuCommand> = {};

	const createDeleteAction = async (message: Message, author: User | null = null) => {
		const collector = message.createReactionCollector({
			filter: (reaction, user) => {
				const emojiIsBin = reaction.emoji.name === '🗑️';
				const reactorIsAuthor = user === (author || message.author);
				const reactorIsSelf = user === client.user;
				if (emojiIsBin && !reactorIsAuthor && reactorIsSelf) {
					reaction.remove();
				}
				return emojiIsBin && reactorIsAuthor && !reactorIsSelf;
			},
			time: 15000
		});
		collector.on('collect', async () => {
			try {
				await message.delete();
			} catch (e) { }
		});
		const reaction = await message.react('🗑️');
		collector.on('end', async () => {
			try {
				await reaction.remove();
			} catch (e) { }
		});
	};

	client.on("ready", async () => {
		logger.delimiter("> ").show();

		exec('git show -s --format="v.%h on %aI"', (error, string) => {
			if (error) {
				logger.log(error.message);
			} else {
				client.user!.setActivity(string, {
					type: 'WATCHING'
				});
			}
		});

		for (let event of events) {
			// Pre-processing (init, interval)
			for (let moduleName of Object.keys(eventModules[event])) {
				const _module = eventModules[event][moduleName];
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
							report(
								`Init failed for module ${moduleName}: ${e.message}`
							);
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
								report(
									`Interval failed for module ${moduleName}: ${e.message}`
								);
						}
					};
					setTimeout(f, module.interval.t);
				}
			}

			// Prompt if user tried to use legacy method
			client.on("messageCreate", async (message) => {
				for (const _command in slashCommands) {
					const command = _command.replace(".name", "");
					if (message.cleanContent.startsWith(`b!${command}`)) {
						let msg: Message;
						if (!slashCommandGuildAvailability[message.guild!.id]) {
							msg = await message.reply(getString("index.legacyPrompt.missingPermission", message.getLocale(), {
								id: Singleton.client.user!.id
							}));
						} else {
							const cmd = slashCommands[_command];
							msg = await message.reply("onContextMenu" in cmd ? getString("index.legacyPrompt.contextMenuCommand", message.getLocale(), { target: cmd.type.toLocaleLowerCase(), command: _command }) : getString("index.legacyPrompt.slashCommand", message.getLocale(), { command: _command }));
						}
						return;
					}
				}
			});

			// Build listeners
			client.on(event, async (message: Message) => {
				if (message.channel.id === process.env.error_chid || message.author === client.user) return;

				for (let _module of Object.values(eventModules[event])) {
					const module = _module.module;
					try {
						if (!_module.loaded) return;
						let matches: RegExpMatchArray | undefined;
						if (module.pattern) {
							matches = message.content.match(module.pattern) || undefined;
							if (!matches) return;
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
						if (result) {
							// await createDeleteAction(message);
						}
					} catch (e) {
						if (e instanceof Error) await pmError(message, e);
					}
				}
				return;
			});
		}

		const APICommands: Dictionary<SlashCommand | ContextMenuCommand> = {};
		const slashCommandGuildAvailability: Dictionary<boolean> = {};

		// Application Command registration
		for (const [_, guild] of client.guilds.cache) {
			const worker = async () => {
				if (slashCommandGuildAvailability[guild.id]) return;

				try {
					await guild.commands.fetch(); // Check for permissions
					slashCommandGuildAvailability[guild.id] = true;
				} catch (e) {
					slashCommandGuildAvailability[guild.id] = false;
					setTimeout(worker, 1000 * 60 * 5);
					return;
				}

				const map: Dictionary<string> = {};

				for (const commandName in slashCommands) {
					const commandNameLocalized = commandName.includes(".") ? getString(commandName, guild.getLocale()) : commandName; // Prevent direct object access getString(commandName, guild.getLocale());
					map[commandNameLocalized] = commandName;
				}
				const commands = await guild.commands.set(Object.values(slashCommands).map(slashCommand => APISlashCommandAdapter(slashCommand, guild.getLocale())));
				for (const [_, command] of commands) {
					APICommands[command.id] = slashCommands[map[command.name]];
				}
			};

			worker();
		}

		// Save all interactions for delete button
		const interactions: Dictionary<BaseCommandInteraction & {
			deleteReply: () => Promise<void>
		}> = {};

		client.on("interactionCreate", async (interaction) => {
			let result: SlashCommandResult | null = null;
			let command: SlashCommand | ContextMenuCommand;

			// Post-processing (Add delete button etc) and send it
			const sendResult = async () => {
				if (result) {
					const _interaction = interaction as BaseCommandInteraction;

					const deleteButton = [
						{
							type: "BUTTON",
							custom_id: `delete${interaction.id}`,
							emoji: {
								name: "🗑️"
							},
							style: "DANGER",
							label: "delete"
						} as MessageComponentButton
					];

					if (result.components) {
						result.components.push(deleteButton);
					} else {
						result.components = [deleteButton];
					}

					const options = InteractionReplyOptionsAdapter(result, interaction.getLocale());

					if (command.defer) {
						await _interaction.editReply(options);
					} else {
						await _interaction.reply(options);
					}

					interactions[_interaction.id] = _interaction;
					setTimeout(async () => {
						delete interactions[_interaction.id];
						options.components!.pop();
						await _interaction.editReply(options);
					}, 1000 * 3600);
				}
			};

			// Delete button
			if (interaction.isButton() && interaction.customId.startsWith("delete")) {
				try {
					const originalInteraction = interactions[interaction.customId.substring(6)];
					if (originalInteraction) {
						if (interaction.user === originalInteraction.user || interaction.memberPermissions?.has('ADMINISTRATOR'))
							await originalInteraction.deleteReply();
						else
							await interaction.reply({
								content: "no u",
								ephemeral: true
							});
					}
				} catch (e) {
				}

				return;
			}

			if (interaction.isCommand() || interaction.isContextMenu()) {
				command = APICommands[interaction.commandId];
				if (command) {
					if (command.defer)
						await interaction.deferReply();

					if (interaction.isCommand() && "onCommand" in command) {
						result = SlashCommandResultAdapter(await command.onCommand(interaction));
					} else if (interaction.isContextMenu() && "onContextMenu" in command) {
						result = SlashCommandResultAdapter(await command.onContextMenu(interaction));
					}

					if (result) return await sendResult();
				}
			} else if (interaction.isButton() || interaction.isMessageComponent() || interaction.isSelectMenu()) {
				command = slashCommands[(interaction.message!.interaction! as MessageInteraction).commandName];
				if (command) {
					if (command.defer)
						await interaction.deferReply();

					if (interaction.isButton() && command.onButton) {
						result = SlashCommandResultAdapter(await command.onButton(interaction));
					} else if (interaction.isMessageComponent() && command.onMessageComponent) {
						result = SlashCommandResultAdapter(await command.onMessageComponent(interaction));
					} else if (interaction.isSelectMenu() && command.onSelectMenu) {
						result = SlashCommandResultAdapter(await command.onSelectMenu(interaction));
					}

					if (result) return await sendResult();
				}
			}

			logger.log(`Unknown ${interaction.type} interaction received: ${JSON.stringify(interaction, null, 4)}`);
		});

		report(`Finished loading in ${+new Date() - +startTime}ms`);
	});

	// Init
	glob("./bin/modules/**/*.js", async (error, fileList) => {
		if (error) throw error;
		for (let file of fileList.filter((_file) => {
			return _file.split("/").pop()![0] != "_";
		})) {
			const fileName = file.split("/").pop()!;
			const moduleName = fileName.slice(0, -3);

			const _module = require(`@app/${file.slice(6)}`).module;
			let tmp: StealthModule | SlashCommand;
			if ("action" in _module) {
				tmp = _module as StealthModule;
				eventModules[tmp.event][moduleName] = {
					module: tmp,
					loaded: false,
				};
			} else if ("name" in _module) {
				tmp = _module as SlashCommand;
				slashCommands[tmp.name] = tmp;
			} else {
				report(`Unknown module ${fileName}!`);
				process.exit();
			}

			report(`Loaded module ${fileName}`);
		}

		await client.login(
			process.argv[2] === "dev"
				? process.env.dev_token
				: process.env.bot_token
		);
		report("Logged in as " + client.user!.tag);
	});
} catch (e) {
	if (e instanceof Error)
		report("Error occurred: " + e.toString());
}
