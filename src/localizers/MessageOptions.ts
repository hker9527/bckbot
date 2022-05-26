import { Localizer } from "@app/Localizations";
import { LocalizableFieldNames, LocalizableFields } from "@type/Localizable";
import { LocaleString } from "discord-api-types/v9";
import { MessageOptions } from "discord.js";
import { LocalizableMessageActionRowAdapter } from "./MessageActionRowOptions";
import { LocalizableMessageEmbedAdapter } from "./MessageEmbedOptions";

export type LocalizableMessageOptions = LocalizableFields & Omit<MessageOptions, LocalizableFieldNames | "reply">;

export class LocalizableMessageOptionsAdapter {
	private data: LocalizableMessageOptions;

	public constructor(data: LocalizableMessageOptions) {
		this.data = data;
	}

	public build(locale: LocaleString): MessageOptions {
		const { components, content, embeds, ...x } = this.data;

		const options: MessageOptions = { ...x };
		
		if (components) {
			options.components = components.map(component => new LocalizableMessageActionRowAdapter(component).build(locale));
		}

		if (content) {
			options.content = Localizer(content, locale);
		}

		if (embeds) {
			options.embeds = embeds?.map(embed => new LocalizableMessageEmbedAdapter(embed).build(locale));
		}

		return options;
	}
}