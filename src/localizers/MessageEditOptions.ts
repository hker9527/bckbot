import { Localizer } from "@app/Localizations";
import { LocaleString } from "discord-api-types/v9";
import { MessageEditOptions } from "discord.js";
import { LActionRowDataLocalizer } from "./data/ActionRowData";
import { LocalizableAPIEmbedAdapter } from "./data/APIEmbed";
import { LocalizableMessageFields } from "./data/_Fields";

export type LMessageEditOptions = LocalizableMessageFields & Omit<MessageEditOptions, keyof LocalizableMessageFields>;

export class LocalizableMessageEditOptionsAdapter {
	private data: LMessageEditOptions;

	public constructor(data: LMessageEditOptions) {
		this.data = data;
	}

	public build(locale: LocaleString): MessageEditOptions {
		const { components, content, embeds, ...x } = this.data;

		const options: MessageEditOptions = { ...x };
		
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