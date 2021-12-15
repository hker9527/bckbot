import { Languages } from "@app/i18n";
import { Localizer } from "@localizer/index";
import { ContextMenuCommand, SlashCommand } from "@type/SlashCommand";
import { ApplicationCommandOptionData, GuildApplicationCommandManager } from "discord.js";

export const APISlashCommandAdapter = (command: SlashCommand | ContextMenuCommand, locale: Languages): Parameters<GuildApplicationCommandManager["set"]>["0"]["0"] => {
	return {
		name: Localizer(command.name, locale),
		description: "description" in command ? Localizer(command.description, locale) : "",
		type: "type" in command ? command.type : "CHAT_INPUT",
		options: command.options?.map(_option => {
			return {
				name: _option.name,
				description: Localizer(_option.description, locale),
				required: !_option.optional ?? true,
				type: _option.type,
				choices: "choices" in _option ? _option.choices : undefined,
				min_value: "min_value" in _option ? _option.min_value : undefined,
				max_value: "max_value" in _option ? _option.max_value : undefined
			} as ApplicationCommandOptionData;
		})
	};
};