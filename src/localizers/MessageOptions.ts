import { Localizer } from "@app/Localizations";
import { LocaleString } from "discord-api-types/v9";
import { BaseMessageOptions } from "discord.js";
import { LActionRowDataLocalizer } from "./data/ActionRowData";
import { LocalizableAPIEmbedAdapter } from "./data/APIEmbed";
import { LocalizableMessageFields } from "./data/_Fields";

export type LBaseMessageOptions = LocalizableMessageFields & Omit<BaseMessageOptions, keyof LocalizableMessageFields>;

export class LocalizableBaseMessageOptionsAdapter {
	private data: LBaseMessageOptions;

	public constructor(data: LBaseMessageOptions) {
		this.data = data;
	}

	public build(locale: LocaleString): BaseMessageOptions {
		const { components, content, embeds, ...x } = this.data;

		const options: BaseMessageOptions = { ...x };
		
		if (components) {
			options.components = components.map(component => new LActionRowDataLocalizer(component).localize(locale));
		}

		if (content) {
			options.content = Localizer(content, locale);
		}

		if (embeds) {
			options.embeds = embeds?.map(embed => new LocalizableAPIEmbedAdapter(embed).build(locale));
		}

		return options;
	}
}