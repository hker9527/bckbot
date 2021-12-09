import { MessageComponentActionRow } from "@type/MessageComponents";
import { MessageButton, MessageOptions, MessageSelectMenu } from "discord.js";

export const APIMessageComponentAdapter = (rows: Array<MessageComponentActionRow>): MessageOptions["components"] => {
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