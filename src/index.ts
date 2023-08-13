import { BaseApplicationCommand } from "@class/ApplicationCommand";
import { LocalizableInteractionReplyOptionsAdapter } from "@localizer/InteractionReplyOptions";
import assert from "assert-ts";
import { ApplicationCommandType, Client, EmbedBuilder, GatewayIntentBits, InteractionReplyOptions, Locale, Message, MessageEditOptions, PermissionFlagsBits, PermissionsBitField, TextChannel } from "discord.js";
import { config } from "dotenv-safe";
import { getName } from "./Localizations";
import { debug, report } from "./Reporting";
import { commands } from "./commands";
import { modules } from "./modules";
import { injectPrototype } from "./prototype";
import { random } from "./utils";
import { LActionRowDataLocalizer } from "@localizer/data/ActionRowData";
import { LocalizableBaseMessageOptionsAdapter } from "@localizer/MessageOptions";

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

try {
	config();
	injectPrototype();

	client.once("ready", async () => {
		// Error reporting
		const errorChannel = await client.channels.fetch(process.env.error_chid!) as TextChannel;
		const error = async (tag: string, e: unknown) => {
			const embed = (e instanceof Error ?
				new EmbedBuilder({
					title: e.name,
					fields: [
						{
							"name": "Tag",
							"value": tag
						},
						{
							"name": "Stack",
							"value": "```\n" + e.stack?.substring(0, 1000) + "\n```" ?? "(none)"
						}
					]
				}) :
				new EmbedBuilder({
					title: "Error",
					fields: [
						{
							"name": "Tag",
							"value": tag
						},
						{
							"name": "Error",
							"value": "```\n" + (e + "").substring(0, 1000) + "\n```" ?? "(none)"
						}
					]
				}));

			const obj = {
				content: new Date().toISOString(),
				embeds: [embed]
			};

			if (process.env.DEBUG) {
				console.error(obj.embeds[0].toJSON().fields![1].value);
			} else {
				await errorChannel.send(obj);
			}
		};

		client.on("error", async (e) => {
			await error("client->error", e);
		});

		const APICommands = commands.map(command => command.toAPI());

		if (process.env.DEBUG) {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			for (const [_, guild] of client.guilds.cache) {
				try {
					await guild.commands.set(APICommands);
					debug("bot.setCommand", `Set command for guild ${guild.name} (${guild.id})`);
				} catch (e) {
					error("bot.setCommand", `Failed to set command for guild ${guild.name} (${guild.id}): ${e}`);
				}
			}
		} else {
			report("Setting global commands");
			try {
				await client.application!.commands.set(APICommands);
			} catch (e) {
				error("bot.setCommand", e);
			}
			report("Setting global commands done");
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
		const timeouts: Record<string, NodeJS.Timeout> = {};

		client.on("interactionCreate", async (interaction) => {
			if (!interaction.isRepliable()) return;

			const deleteButton = createDeleteButton(interaction.locale);

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
								const reply = new LocalizableInteractionReplyOptionsAdapter(await onTimeout(msg)).build(interaction.locale);
								await interaction.editReply(reply);
							}
							delete timeouts[id];
						} catch (e) { }
					}, 15 * 1000);

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
			}).build(interaction.locale);

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
								}).build(interaction.locale)
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
								}).build(interaction.locale)
							);
						} else {
							return await reply(
								new LocalizableInteractionReplyOptionsAdapter({
									content: {
										key: "delete.deletingOthersMessage"
									},
									ephemeral: true
								}).build(interaction.locale)
							);
						}
					} else {
						return await reply(
							new LocalizableInteractionReplyOptionsAdapter({
								content: {
									key: "delete.noPermission"
								},
								ephemeral: true
							}).build(interaction.locale)
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
						).build(interaction.locale);
					} catch (e) {
						error(`commands/${command.name}.onCommand`, e);
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
						).build(interaction.locale);
					} catch (e) {
						error(`commands/${command.name}.onContextMenu`, e);
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
						).build(interaction.locale);
					} catch (e) {
						error(`commands/${command.name}.onContextMenu`, e);
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
							).build(interaction.locale);
						} else if (interaction.isStringSelectMenu() && command.onSelectMenu) {
							response = new LocalizableInteractionReplyOptionsAdapter(
								await command.onSelectMenu(interaction)
							).build(interaction.locale);
						} else {
							// TODO: Handle unknown interaction
						}
					} catch (e) {
						error(`commands/${command.name}.${interaction.isButton() ? "onButton" : "onSelectMenu"}`, e);
					}

					await reply(response, command.onTimeout);
				} else if (interaction.isModalSubmit()) {
					// TODO: Modal submit
				}
			} catch (e) {
				error("client->interactionCreate", e);
				await reply(generalErrorReply);
			}
		});

		// StealthModule
		for (const event of ["messageCreate", "messageUpdate", "messageDelete"]) {
			client.on(event, async (message: Message) => {
				if (message.author.bot) return;

				// Check if message's channel lets us to send message
				const botAsMember = await message.guild?.members.fetch(client.user!.id);
				if (!(botAsMember && botAsMember.permissions.has(PermissionsBitField.Flags.SendMessages))) return;

				for (const module of modules.filter(module => module.event === event)) {
					let matches;

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
							const deleteButton = createDeleteButton(message.getLocale());

							const result = new LocalizableBaseMessageOptionsAdapter(
								_result.result
							).build(message.getLocale());

							const _components = result.components?.slice() ?? [];

							result.components = result.components ? [...result.components, deleteButton] : [deleteButton];

							const msg = _result.type === "send" ? await message.channel.send(result) : await message.reply(result);

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
										).build(message.getLocale());
										await edited.edit(reply);
									}
								} catch (e) { }
							}, 1000 * 15);
						} else {
							if (_result) break;
						}
					} catch (e) {
						error(`modules/${module.name}.${event}`, e);
					}
				}
			});
		}

		report(`Logged in as ${client.user!.tag}!`);
	});

	client.login(process.env.TOKEN);
} catch (e) {
	console.error("client", e);
}