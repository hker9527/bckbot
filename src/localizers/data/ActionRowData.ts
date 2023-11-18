import { Localizer } from "@app/Localizations";
import type { L } from "@type/Localizer";
import type { LocaleString } from "discord-api-types/v9";
import type { ActionRowData, InteractionButtonComponentData, LinkButtonComponentData, MessageActionRowComponentData, SelectMenuComponentOptionData, StringSelectMenuComponentData } from "discord.js";
import { ButtonStyle, ComponentType } from "discord.js";

interface LBaseComponentData {
	type: keyof typeof ComponentType;
};

interface LInteractionButtonComponentData extends LBaseComponentData, Omit<L<InteractionButtonComponentData, "label">, "type" | "style"> {
	type: "Button"; // Upstream problem bruh
	style: Exclude<keyof typeof ButtonStyle, "Link">;
};

interface LLinkButtonComponentData extends LBaseComponentData, Omit<L<LinkButtonComponentData, "label">, "type" | "style"> {
	type: "Button"; // Upstream problem bruh
	style: "Link";
};

interface LStringSelectMenuComponentData extends Omit<L<StringSelectMenuComponentData, "placeholder">, "type" | "options"> {
	type: "StringSelect",
	options: L<SelectMenuComponentOptionData, "label" | "description">[]
};

export type LActionRowComponentData = (
	| LInteractionButtonComponentData
	| LLinkButtonComponentData
	| LStringSelectMenuComponentData
);

export interface LActionRowData {
	type: "ActionRow";
	components: LActionRowComponentData[];
};

export class LActionRowDataLocalizer {
	private data: LActionRowData;

	public constructor(data: LActionRowData) {
		this.data = data;
	}

	public localize(locale: LocaleString): ActionRowData<MessageActionRowComponentData> {
		const actionRow: ActionRowData<MessageActionRowComponentData> = {
			type: ComponentType.ActionRow,
			components: this.data.components.map(component => {
				switch (component.type) {
					case "Button": {
						if (component.style === "Link") {
							const { type, style, label, ...y } = component;
							return {
								type: ComponentType[type],
								style: ButtonStyle[style],
								label: label ? Localizer(label, locale) : undefined,
								...y
							};
						}

						const { type, style, label, ...y } = component;
						return {
							type: ComponentType[type],
							style: ButtonStyle[style],
							label: label ? Localizer(label, locale) : undefined,
							...y
						};
					} 
					case "StringSelect": {
						const { type, options, placeholder, ...y } = component;
		
						return {
							type: ComponentType[type],
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
						}
					}
				}
			})
		};
		
		return actionRow;
	}
}