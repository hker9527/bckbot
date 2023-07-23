import { Localizer } from "@app/Localizations";
import { Localizable } from "@type/Localizable";
import { LocaleString } from "discord-api-types/v9";
import { BaseMessageComponentOptions, ButtonStyle, InteractionButtonOptions, LinkButtonOptions, MessageActionRowOptions, MessageSelectMenuOptions, MessageSelectOptionData } from "discord.js";

interface LocalizableBaseButtonOptions {
	type: "BUTTON";
}

interface LocalizableInteractionButtonOptions extends Omit<InteractionButtonOptions, "customId" | "type" | "label">, LocalizableBaseButtonOptions {
	custom_id: string;
	label?: Localizable
};

interface LocalizableLinkButtonOptions extends Omit<LinkButtonOptions, "type">, LocalizableBaseButtonOptions {};

type LocalizableMessageButtonOptions = LocalizableInteractionButtonOptions | LocalizableLinkButtonOptions;

interface LocalizableMessageSelectOptionData extends Omit<MessageSelectOptionData, "label" | "description"> {
	label: Localizable,
	description?: Localizable
};

interface LocalizableMessageSelectMenuOptions extends Omit<MessageSelectMenuOptions, "customId" | "options" | "placeholder"> {
	type: "SELECT_MENU",
	custom_id: string,
	options: LocalizableMessageSelectOptionData[],
	placeholder?: Localizable
};


export type LocalizableMessageActionRowOptions = (
	| LocalizableMessageButtonOptions
	| LocalizableMessageSelectMenuOptions
)[];

export class LocalizableMessageActionRowAdapter {
	private data: LocalizableMessageActionRowOptions;

	public constructor(data: LocalizableMessageActionRowOptions) {
		this.data = data;
	}

	public build(locale: LocaleString): (Required<BaseMessageComponentOptions> & MessageActionRowOptions) {
		const actionRow: (Required<BaseMessageComponentOptions> & MessageActionRowOptions) = {
			type: "ACTION_ROW",
			components: []
		};

		for (const component of this.data) {
			switch (component.type) {
				case "BUTTON":
					switch (component.style) {
						case "Link":
							actionRow.components.push(component);
							break;
						default:
							const { label, ...y } = component;
							actionRow.components.push({
								label: label ? Localizer(label, locale) : undefined,
								...y
							});
							break;
					}
					break;
				case "SELECT_MENU":
					const { options, placeholder, ...y } = component;

					actionRow.components.push({
						options: options.map(option => {
							const { label, description, ...z } = option;
							return {
								label: Localizer(label, locale),
								description: description ? Localizer(description, locale) : undefined,
								...z
							};
						}),
						placeholder: placeholder ? Localizer(placeholder, locale) : undefined,
						...y
					});
					break;
			}
		}

		return actionRow;
	}
}