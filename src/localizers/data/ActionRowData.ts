import { Localizer } from "@app/Localizations";
import { L } from "@type/Localizer";
import { LocaleString } from "discord-api-types/v9";
import { APIBaseComponent, ActionRowData, ButtonStyle, ComponentType, InteractionButtonComponentData, LinkButtonComponentData, MessageActionRowComponentData, SelectMenuComponentOptionData, StringSelectMenuComponentData } from "discord.js";

interface LStringSelectMenuComponentData extends Omit<L<StringSelectMenuComponentData, "placeholder">, "options"> {
	options: L<SelectMenuComponentOptionData, "label" | "description">[]
};

export type LActionRowData = (
	| APIBaseComponent<ComponentType.ActionRow>
	| (L<InteractionButtonComponentData, "label"> | LinkButtonComponentData) & { type: ComponentType.Button } // Upstream problem bruh
	| LStringSelectMenuComponentData
);

export class LActionRowDataLocalizer {
	private data: LActionRowData;

	public constructor(data: LActionRowData) {
		this.data = data;
	}

	public localize(locale: LocaleString): ActionRowData<MessageActionRowComponentData> {
		const actionRow: ActionRowData<MessageActionRowComponentData> = {
			type: this.data.type,
			components: []
		};

		switch (this.data.type) {
			case ComponentType.Button:
				switch (this.data.style) {
					case ButtonStyle.Link:
						actionRow.components.push(this.data);
						break;
					default:
						const { label, ...y } = this.data;
						actionRow.components.push({
							label: label ? Localizer(label, locale) : undefined,
							...y
						});
						break;
				}
				break;		
			case ComponentType.StringSelect:
				const { options, placeholder, ...y } = this.data;

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
			default:
				break;
		}

		return actionRow;
	}
}