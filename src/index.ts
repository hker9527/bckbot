import type { BaseApplicationCommand } from "@class/ApplicationCommand";
import { LocalizableInteractionReplyOptionsAdapter } from "@localizer/InteractionReplyOptions";
import assert from "assert-ts";
import type { ApplicationCommandType, InteractionReplyOptions, Message, MessageEditOptions, TextChannel } from "discord.js";
import { Client, GatewayIntentBits, Locale, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import { getName } from "./Localizations";
import { commands } from "./commands";
import { modules } from "./modules";
import { injectPrototype } from "./prototype";
import { random } from "./utils";
import { LActionRowDataLocalizer } from "@localizer/data/ActionRowData";
import { LocalizableBaseMessageOptionsAdapter } from "@localizer/MessageOptions";
import { PrismaClient } from "@prisma/client";
import { Logger } from "tslog";

const logger = new Logger({
	name: "index",
	minLevel: Bun.env.NODE_ENV === "production" ? 3 : 0
});

const TIMEOUT = 30 * 1000;

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.MessageContent
	]
});

const prismaClient = new PrismaClient();

const fetchUserLocale = async (id: string, override?: boolean): Promise<Locale> => {
	const sublogger = logger.getSubLogger({
		name: "fetchUserLocale"
	});

	try {
		const languageItem = await prismaClient.language.findFirst({
			where: {
				id,
				type: "u",
				override
			}
		});

		if (languageItem) {
			return languageItem.language as Locale;
		}

		return Locale.EnglishUS;
	} catch (e) {
		sublogger.error("fetchUserLocale", e);
		return Locale.EnglishUS;
	}
};

const shouldIgnoreUser = async (id: string) => {
	const sublogger = logger.getSubLogger({
		name: "shouldIgnoreUser"
	});

	try {
		const ignoreItem = await prismaClient.ignore.findFirst({
			where: {
				id,
				type: "u"
			}
		});

		return ignoreItem !== null;
	} catch (e) {
		sublogger.error("shouldIgnoreUser", e);
		return false;
	}
};

try {
	injectPrototype();

	client.once("ready", async () => {
		// Error reporting
		const errorChannel = await client.channels.fetch(Bun.env.error_chid!) as TextChannel;
		const handleError = async (tag: string, e: unknown) => {
			const errorObj = logger.error(tag, e);
			// Encode the content into an attachment
			const attachment = Buffer.from(JSON.stringify({
				time: new Date().toISOString(),
				errorObj
			}, null, 4));

			await errorChannel.send({
				content: `Error occurred in \`${tag}\``,
				files: [{
					name: `${tag}.json`,
					attachment
				}]
			});
		};

		client.on("error", async (e) => {
			await handleError("client->error", e);
		});

		const APICommands = commands.map(command => command.toAPI());

		if (Bun.env.NODE_ENV === "production") {
			logger.info("Setting global commands");
			try {
				await client.application!.commands.set(APICommands);
			} catch (e) {
				handleError("bot.setCommand", e);
			}
			logger.info("Setting global commands done");
		} else {
			await client.application!.commands.set([]);
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			for (const [_, guild] of client.guilds.cache) {
				try {
					await guild.commands.set(APICommands);
					logger.debug("bot.setCommand", `Set command for guild ${guild.name} (${guild.id})`);
				} catch (e) {
					logger.error("bot.setCommand", `Failed to set command for guild ${guild.name} (${guild.id}): ${e}`);
				}
			}
		}

		const createDeleteButton = (locale: Locale) => new LActionRowDataLocalizer({
			type: "ActionRow",
			components: [{
				customId: "delete",
				type: "Button",
				style: "Danger",
				emoji: {
					name: random(0, 10) === 0 ? "🚮" : "🗑️"
				}
			}]
		}).localize(locale);

		// A mapping from the source message's author id that triggered stealth modules to the replied message
		const sources: Record<string, string> = {};

		// Linked list storing all interaction ids and it's parent, null if it's the root
		const timeouts: Record<string, Timer> = {};

		client.on("interactionCreate", async (interaction) => {
			if (!interaction.isRepliable()) {
				return;
			}

			const locale = (await fetchUserLocale(interaction.user.id, true)) ?? interaction.locale;

			try {
				if (!await shouldIgnoreUser(interaction.user.id)) {
					// Store user's language if not exists or can be overridden
					await prismaClient.language.upsert({
						where: {
							id: interaction.user.id,
							type: "u",
							override: false
						},
						create: {
							id: interaction.user.id,
							type: "u",
							language: interaction.locale,
							override: false
						},
						update: {
							language: interaction.locale
						}
					});
				}
			} catch (e) { }

			const deleteButton = createDeleteButton(locale);

			const reply = async (response: InteractionReplyOptions, onTimeout?: BaseApplicationCommand<ApplicationCommandType>["onTimeout"]) => {
				if (response.ephemeral) {
					if (interaction.replied || interaction.deferred) {
						await interaction.editReply(response)
					} else {
						await interaction.reply(response);
					}
				} else {
					const _components = response.components?.slice();

					if (response.components) {
						response.components.push(deleteButton);
					} else {
						response.components = [deleteButton];
					}

					if (interaction.replied || interaction.deferred) {
						await interaction.editReply(response)
					} else {
						await interaction.reply(response);
					}

					// Add interaction id to linked list
					// Root level commands

					let id = interaction.id;
					const timeout = setTimeout(async () => {
						try {
							// eslint-disable-next-line @typescript-eslint/no-unused-vars
							const { components, ...x } = response;
							const msg = await interaction.editReply({ components: _components ?? [], ...x });
							if (onTimeout) {
								const reply = new LocalizableInteractionReplyOptionsAdapter(await onTimeout(msg)).build(locale);
								await interaction.editReply(reply);
							}
							delete timeouts[id];
						} catch (e) { }
					}, TIMEOUT);

					if (interaction.isCommand()) {
						timeouts[interaction.id] = timeout;
					} else if (interaction.isMessageComponent()) {
						const parent = interaction.message.interaction!.id;
						clearTimeout(timeouts[parent]);
						timeouts[parent] = timeout;
						id = parent;
					}
				}
			};

			const generalErrorReply = new LocalizableInteractionReplyOptionsAdapter({
				content: {
					key: "index.error"
				}
			}).build(locale);

			try {
				// Delete function
				if (
					interaction.isButton() && interaction.customId === "delete"
					|| interaction.isMessageContextMenuCommand() && interaction.command!.name === getName("delete").name
				) {
					await interaction.deferReply({
						ephemeral: true
					});

					const sourceMessage = (interaction.isMessageContextMenuCommand() ? interaction.targetMessage : interaction.message) as Message;

					if (sourceMessage.deletable) {
						// Check if the interaction issuer is the message author or is an admin
						const guildUser = (await interaction.guild?.members.fetch(interaction.user))!;

						if (sourceMessage.author.id !== interaction.client.user!.id) {
							return await reply(
								new LocalizableInteractionReplyOptionsAdapter({
									content: {
										key: "delete.notMyMessage"
									},
									ephemeral: true
								}).build(locale)
							);
						}

						if (
							sources[sourceMessage.id] === interaction.user.id
							|| sourceMessage.mentions.repliedUser?.id === interaction.user.id
							|| sourceMessage.interaction && sourceMessage.interaction.user.id === interaction.user.id
							|| guildUser.permissions.has(PermissionFlagsBits.Administrator)
						) {
							await sourceMessage.delete();
							return await reply(
								new LocalizableInteractionReplyOptionsAdapter({
									content: {
										key: "delete.deleted"
									},
									ephemeral: true
								}).build(locale)
							);
						} else {
							return await reply(
								new LocalizableInteractionReplyOptionsAdapter({
									content: {
										key: "delete.deletingOthersMessage"
									},
									ephemeral: true
								}).build(locale)
							);
						}
					} else {
						return await reply(
							new LocalizableInteractionReplyOptionsAdapter({
								content: {
									key: "delete.noPermission"
								},
								ephemeral: true
							}).build(locale)
						);
					}
				} else if (interaction.isChatInputCommand()) {
					const command = commands.find(command => command.name === interaction.command?.name);
					assert(command !== undefined);
					assert(command.isSlashApplicationCommand());

					if (command.defer) {
						await interaction.deferReply();
					}

					let response: InteractionReplyOptions = generalErrorReply;

					try {
						response = new LocalizableInteractionReplyOptionsAdapter(
							await command.onCommand(interaction)
						).build(locale);
					} catch (e) {
						handleError(`commands/${command.name}.onCommand`, e);
					}

					await reply(response, command.onTimeout);
				} else if (interaction.isUserContextMenuCommand()) {
					const command = commands.find(command => getName(command.name).name === interaction.command?.name);
					assert(command !== undefined);
					assert(command.isUserContextMenuCommand());

					if (command.defer) {
						await interaction.deferReply();
					}

					// TODO: wtf is this
					let response: InteractionReplyOptions = generalErrorReply;

					try {
						response = new LocalizableInteractionReplyOptionsAdapter(
							await command.onContextMenu(interaction)
						).build(locale);
					} catch (e) {
						handleError(`commands/${command.name}.onContextMenu`, e);
					}

					await reply(response, command.onTimeout);
				} else if (interaction.isMessageContextMenuCommand()) {
					const command = commands.find(command => getName(command.name).name === interaction.command?.name)
					assert(command !== undefined);
					assert(command.isMessageContextMenuCommand());

					if (command.defer) {
						await interaction.deferReply();
					}

					// TODO: wtf is this
					let response: InteractionReplyOptions = generalErrorReply;
					try {
						response = new LocalizableInteractionReplyOptionsAdapter(
							await command.onContextMenu(interaction)
						).build(locale);
					} catch (e) {
						handleError(`commands/${command.name}.onContextMenu`, e);
					}

					await reply(response, command.onTimeout);
				} else if (interaction.isMessageComponent()) {
					assert(interaction.message.interaction !== null && interaction.message.interaction !== undefined);
					const commandName = interaction.message.interaction.commandName;

					const command = commands.find(command => getName(command.name).name === commandName);
					assert(command !== undefined);

					if (command.defer) {
						await interaction.deferUpdate();
					}

					let response: InteractionReplyOptions = generalErrorReply;

					try {
						if (interaction.isButton() && command.onButton) {
							response = new LocalizableInteractionReplyOptionsAdapter(
								await command.onButton(interaction)
							).build(locale);
						} else if (interaction.isStringSelectMenu() && command.onSelectMenu) {
							response = new LocalizableInteractionReplyOptionsAdapter(
								await command.onSelectMenu(interaction)
							).build(locale);
						} else {
							// TODO: Handle unknown interaction
						}
					} catch (e) {
						handleError(`commands/${command.name}.${interaction.isButton() ? "onButton" : "onSelectMenu"}`, e);
					}

					await reply(response, command.onTimeout);
				} else if (interaction.isModalSubmit()) {
					// TODO: Modal submit
				}
			} catch (e) {
				handleError("client->interactionCreate", e);
				await reply(generalErrorReply);
			}
		});

		// StealthModule
		for (const event of ["messageCreate", "messageUpdate", "messageDelete"]) {
			client.on(event, async (message: Message) => {
				if (message.author.bot || await shouldIgnoreUser(message.author.id)) {
					return;
				}

				// Check if message's channel lets us to send message
				const botAsMember = await message.guild?.members.fetch(client.user!.id);
				if ("permissionsFor" in message.channel && !message.channel.permissionsFor(botAsMember!)?.has(PermissionsBitField.Flags.SendMessages)) {
					return;
				}

				const locale = (await fetchUserLocale(message.author.id) ?? message.guild?.preferredLocale ?? Locale.EnglishUS) as Locale;

				for (const module of modules.filter(module => module.event === event)) {
					let matches;

					// Remove spoilers from message
					const regex = /(\|\|)(.*?)(\|\|)/g;
					message.content = message.content.replace(regex, "");

					if (module.pattern) {
						matches = message.content.match(module.pattern) ?? undefined;
						if (!matches) continue;
					}

					try {
						const _result = await module.action({
							message,
							matches
						});

						if (typeof _result === "object") {
							const deleteButton = createDeleteButton(locale);

							const result = new LocalizableBaseMessageOptionsAdapter(
								_result.result
							).build(locale);

							const _components = result.components?.slice() ?? [];

							result.components = result.components ? [...result.components, deleteButton] : [deleteButton];

							const msg = _result.type === "send" ? await message.channel.send(result) : await message.reply({ ...result, allowedMentions: { repliedUser: false } });

							sources[msg.id] = message.author.id;

							setTimeout(async () => {
								try {
									// eslint-disable-next-line @typescript-eslint/no-unused-vars
									const { components, ...x } = result;
									const edited = await msg.edit({
										components: _components,
										...x
									} as MessageEditOptions);

									if (module.onTimeout) {
										const reply = new LocalizableBaseMessageOptionsAdapter(
											await module.onTimeout(edited)
										).build(locale);
										await edited.edit(reply);
									}
								} catch (e) { }
							}, TIMEOUT);
						} else {
							if (_result) break;
						}
					} catch (e) {
						handleError(`modules/${module.name}.${event}`, e);
					}
				}
			});
		}

		logger.info(`Logged in as ${client.user!.tag}!`);
	});

	client.login(Bun.env.TOKEN);
} catch (e) {
	logger.error("client", e);
}