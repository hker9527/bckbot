import { Languages, getString } from "@app/i18n";
import { SlashCommand, ContextMenuCommand } from "@type/SlashCommand";
import { GuildApplicationCommandManager, ApplicationCommandOptionData } from "discord.js";

export const APISlashCommandAdapter = (command: SlashCommand | ContextMenuCommand, locale: Languages): Parameters<GuildApplicationCommandManager["set"]>["0"]["0"] => {
	return {
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
};