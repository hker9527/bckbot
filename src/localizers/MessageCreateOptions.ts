import { Localizer } from "@app/Localizations";
import { LocaleString } from "discord-api-types/v9";
import { MessageCreateOptions } from "discord.js";
import { LActionRowDataLocalizer } from "./data/ActionRowData";
import { LocalizableAPIEmbedAdapter } from "./data/APIEmbed";
import { LocalizableMessageFields } from "./data/_Fields";

export type LMessageCreateOptions = LocalizableMessageFields & Omit<MessageCreateOptions, keyof LocalizableMessageFields>;

export class LocalizableMessageCreateOptionsAdapter {
	private data: LMessageCreateOptions;

	public constructor(data: LMessageCreateOptions) {
		this.data = data;
	}

	public build(locale: LocaleString): MessageCreateOptions {
		const { components, content, embeds, ...x } = this.data;

		const options: MessageCreateOptions = { ...x };
		
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