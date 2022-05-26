import { LocalizableApplicationCommandOptionData, LocalizableInteractionReplyOptionsAdapter } from "@localizer/InteractionReplyOptions";
import { LocalizableMessageActionRowAdapter } from "@localizer/MessageActionRowOptions";
import { LocalizableMessageOptionsAdapter } from "@localizer/MessageOptions";
import { Command, ContextMenuApplicationCommands, SlashApplicationCommands } from "@type/Command";
import { StealthModule } from "@type/StealthModule";
import { ApplicationCommandDataResolvable, ApplicationCommandNumericOptionData, ApplicationCommandOptionData, Client, Intents, Message, MessageInteraction, InteractionReplyOptions } from "discord.js";
import { ApplicationCommandTypes } from "discord.js/typings/enums";
import { config } from "dotenv-safe";
import { readdirSync } from "fs";
import { getDescription, getName } from "./Localizations";
import { injectPrototype } from "./prototype";
import { debug, error } from "./Reporting";
import { random } from "./utils";

const client = new Client({
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
		Intents.FLAGS.DIRECT_MESSAGES,
		Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
	]
});

const loadCommand = async (path: string) => {
	const module = await import(path);

	if (!("command" in module)) {
		throw path + ": Invalid module format";
	}

	return { path, command: module.command };
};

const loadModule = async (path: string): Promise<{ path: string, module: StealthModule }> => {
	const module = await import(path);

	if (!("module" in module)) {
		throw path + ": Invalid module format";
	}

	return { path, module: module.module };
};

try {
	config();
	injectPrototype();

	client.once("ready", async () => {
		// Command
		const commands: Command[] = (await Promise.allSettled(readdirSync("./src/commands/")
			.filter(file => !file.startsWith("_") && file.endsWith(".ts"))
			.map(async file => await loadCommand("./commands/" + file)))
		).map((result) => {
			if (result.status === "fulfilled") {
				debug("bot.loadCommand", "Loaded file: " + result.value.path);
				return result.value.command;
			}
			error("bot.loadCommand", "Failed to load file " + result.reason);
			return null;
		})
			.filter((command): command is Command => command !== null);

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const [_, guild] of client.guilds.cache) {
			try {
				await guild.commands.set(commands.map((command: Command): ApplicationCommandDataResolvable => {
					if ("onCommand" in command) {
						return {
							...getName(command.name),
							...getDescription(command.name),
							options: Object.entries(command.options ?? {}).map((arr: [string, LocalizableApplicationCommandOptionData]): ApplicationCommandOptionData => {
								const [name, option] = arr;

								let _ret: Record<string, any> = {
									...getName(command.name, name),
									...getDescription(command.name, name),
									type: option.type
								};

								if (option.choices) {
									_ret.choices = Object.entries(option.choices).map(([key, value]) => ({
										...getName(command.name, key),
										value
									}));
								}

								switch (option.type) {
									case "NUMBER":
									case "INTEGER":
										const ret = _ret as ApplicationCommandNumericOptionData;
										ret.min_value = option.min;
										ret.max_value = option.max;

										return ret;
									default:
										return _ret as ApplicationCommandOptionData;
								}
							})
						};
					} else {
						return {
							type: command.type === "USER" ? ApplicationCommandTypes.USER : ApplicationCommandTypes.MESSAGE,
							...getName(command.name)
						}
					}
				}));
			} catch (e) {
				error("bot.setCommand", "Failed to set command for guild " + guild.name);
			}
		}

		client.on("interactionCreate", async (interaction) => {
			if (!interaction.isRepliable()) return;

			const deleteButton = new LocalizableMessageActionRowAdapter([
				{
					type: "BUTTON",
					style: "DANGER",
					custom_id: "delete",
					label: {
						key: "index.delete"
					},
					emoji: random(0, 10) === 0 ? "🚮" : "🗑️"
				}
			]).build(interaction.getLocale());

			const reply = async (response: InteractionReplyOptions) => {
				if (!(response.ephemeral === true)) {
					if (response.components) {
						response.components.push(deleteButton);
					} else {
						response.components = [deleteButton];
					}
				}

				return interaction.replied || interaction.deferred ? await interaction.editReply(response) : await interaction.reply(response);
			};
			try {
				// Delete button
				if (interaction.isButton() && interaction.customId === "delete") {
					const sourceMessage = interaction.message;

					if (sourceMessage && "delete" in sourceMessage) {
						// Check if the interaction issuer is the message author or is an admin
						const guildUser = (await interaction.guild?.members.fetch(interaction.user))!;

						if (sourceMessage.interaction!.user.id === interaction.user.id || guildUser.permissions.has("ADMINISTRATOR")) {
							await sourceMessage.delete();
						} else {
							await reply(
								new LocalizableInteractionReplyOptionsAdapter({
									content: {
										key: "index.deletingOthersMessage"
									},
									ephemeral: true
								}).build(interaction.getLocale())
							);
						}
					}
				} else if (interaction.isCommand()) {
					const command = commands.find(command => command.name === interaction.command?.name) as SlashApplicationCommands | undefined;
					if (command) {
						if (command.defer) {
							await interaction.deferReply();
						}

						let response: InteractionReplyOptions = {
							content: "Error..."
						};

						try {
							response = new LocalizableInteractionReplyOptionsAdapter(
								await command.onCommand(interaction)
							).build(interaction.getLocale());
						} catch (e) {
							error("client->interactionCreate", e);
						}

						await reply(response);
					}
				} else if (interaction.isContextMenu()) {
					const command = commands.find(command => getName(command.name).name === interaction.command?.name) as ContextMenuApplicationCommands | undefined;
					if (command) {
						if (command.defer) {
							await interaction.deferReply();
						}
						let response: InteractionReplyOptions = {
							content: "Error..."
						};

						try {
							response = new LocalizableInteractionReplyOptionsAdapter(
								await command.onContextMenu(interaction)
							).build(interaction.getLocale());
						} catch (e) {
							error("client->interactionCreate", e);
						}

						await reply(response);
					}
				} else if (interaction.isMessageComponent()) {
					const command = commands.find(command => getName(command.name).name === (interaction.message.interaction as MessageInteraction).commandName) as Command | undefined;
					if (!command) return;

					if (interaction.isButton() && !command.onButton) return;
					if (interaction.isSelectMenu() && !command.onSelectMenu) return;

					if (command.defer) {
						await interaction.deferUpdate();
					}

					let response: InteractionReplyOptions = {
						content: "Error..."
					};

					try {
						if (interaction.isButton()) {
							response = new LocalizableInteractionReplyOptionsAdapter(
								await command.onButton!(interaction)
							).build(interaction.getLocale());
						} else if (interaction.isSelectMenu()) {
							response = new LocalizableInteractionReplyOptionsAdapter(
								await command.onSelectMenu!(interaction)
							).build(interaction.getLocale());
						}
					} catch (e) {
						error("client->interactionCreate", e);
					}

					await reply(response);
				} else if (interaction.isModalSubmit()) {
					// TODO: Modal submit
				}
			} catch (e) {
				error("interaction", e);
				await reply({
					content: "Error!!!!"
				});
			}
		});

		// StealthModule
		const stealthModules: StealthModule[] = (await Promise.allSettled(readdirSync("./src/modules/")
			.filter(file => !file.startsWith("_") && file.endsWith(".ts"))
			.map(async file => await loadModule("./modules/" + file)))
		).map((result) => {
			if (result.status === "fulfilled") {
				debug("bot.loadModule", "Loaded file: " + result.value.path);
				return result.value.module;
			}
			if (!["command", "module"].includes(result.reason)) error("bot.loadModule", "Failed to load file " + result.reason);
			return null;
		})
			.filter((module): module is StealthModule => module !== null);

		for (const event of ["messageCreate", "messageUpdate", "messageDelete"]) {
			client.on(event, async (message: Message) => {
				if (message.author.bot) return;

				for (const module of stealthModules.filter(module => module.event === event)) {
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
							const result = new LocalizableMessageOptionsAdapter(
								_result.result
							).build(message.getLocale());

							if (_result.type === "send") {
								await message.channel.send(result);
							} else {
								await message.reply(result);
							}
						} else {
							if (_result) break;
						}
					} catch (e) {
						error(event, e);
					}
				}
			});
		}

		console.log("client->ready", "Ready!");
	});

	client.login(process.env.TOKEN);
} catch (e) {
	console.error("client->ready", e);
}