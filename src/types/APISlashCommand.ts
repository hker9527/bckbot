import { getString, Languages } from "@app/i18n";
import { ApplicationCommandDataResolvable, ApplicationCommandOptionData, ChatInputApplicationCommandData, MessageApplicationCommandData, UserApplicationCommandData } from "discord.js";
import { ContextMenuCommand, SlashCommand } from "./SlashCommand";

export const APISlashCommandFactory = (command: SlashCommand | ContextMenuCommand, locale: Languages): ApplicationCommandDataResolvable => {
	const o: UserApplicationCommandData | MessageApplicationCommandData | ChatInputApplicationCommandData = {
		name: command.name.includes(".") ? getString(command.name, locale) : command.name, // Prevent direct object access
		description: getString("description" in command ? command.description : "", locale),
		type: "type" in command ? command.type : "CHAT_INPUT",
		options: command.options?.map(_option => {
			return {
				name: _option.name,
				description: getString(_option.description, locale),
				required: !_option.optional ?? true,
				type: _option.type,
				choices: "choices" in _option ? _option.choices : undefined,
				min_value: "min_value" in _option ? _option.min_value : undefined,
				max_value: "max_value" in _option ? _option.max_value : undefined
			} as ApplicationCommandOptionData;
		})
	};

	return o;
};