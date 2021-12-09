import { getString, Languages } from "@app/i18n";
import { MessageComponentActionRow } from "@type/MessageComponents";
import { ApplicationCommandOptionData, GuildApplicationCommandManager, MessageButton, MessageOptions, MessageSelectMenu } from "discord.js";
import { ContextMenuCommand, SlashCommand } from "./types/SlashCommand";

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

export const APIMessageComponentAdapter = (rows: Array<MessageComponentActionRow>): MessageOptions["components"] => {
	
	rows.push([
		{
			type: "BUTTON",
			custom_id: "delete",
			emoji: {
				name: "🗑️"
			},
			style: "DANGER",
			label: "Delete"
		}
	]);
	
	return rows.map(row => {
		return {
			type: "ACTION_ROW",
			components: row.map(component => {
				const base = {
					type: component.type,
					customId: "custom_id" in component ? component.custom_id : null,
					disabled: component.disabled ?? false,
				};
				if (component.type == "BUTTON") {
					return {
						...base,
						emoji: component.emoji,
						label: "label" in component ? component.label : undefined,
						style: component.style,
						url: component.style == "LINK" ? component.url : undefined,
					} as MessageButton;
				} else {
					return {
						...base,
						maxValues: component.max_values,
						minValues: component.min_values,
						placeholder: component.placeholder,
						options: component.options.map(option => ({
							default: option!.default ?? false,
							description: option!.description ?? null,
							emoji: option!.emoji ?? null,
							label: option!.label,
							value: option!.value
						}))
					} as MessageSelectMenu;
				}
			})
		}
	});
}