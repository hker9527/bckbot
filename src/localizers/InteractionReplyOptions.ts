import { Localizer } from "@app/Localizations";
import { LocalizableFieldNames, LocalizableFields } from "@type/Localizable";
import { LocaleString } from "discord-api-types/v9";
import { InteractionReplyOptions } from "discord.js";
import { LocalizableMessageActionRowAdapter } from "./MessageActionRowOptions";
import { LocalizableMessageEmbedAdapter } from "./MessageEmbedOptions";

export type LocalizableInteractionReplyOptions = LocalizableFields & Omit<InteractionReplyOptions, LocalizableFieldNames>;

export class LocalizableInteractionReplyOptionsAdapter {
	private data: LocalizableInteractionReplyOptions;

	public constructor(data: LocalizableInteractionReplyOptions) {
		this.data = data;
	}

	public build(locale: LocaleString): InteractionReplyOptions {
		const { components, content, embeds, ...x } = this.data;

		const options: InteractionReplyOptions = { ...x };
		
		if (components) {
			options.components = components.map(component => new LocalizableMessageActionRowAdapter(component).build(locale));
		}

		if (content) {
			options.content = Localizer(content, locale);
		}

		if (embeds) {
			options.embeds = embeds.map(e => new LocalizableMessageEmbedAdapter(e).build(locale));
		}

		return options;
	}
};