import { Localizer } from "@app/Localizations";
import type { LocaleString } from "discord-api-types/v9";
import type { InteractionReplyOptions } from "discord.js";
import { LActionRowDataLocalizer } from "./data/ActionRowData";
import { LocalizableAPIEmbedAdapter } from "./data/APIEmbed";
import type { LocalizableMessageFields } from "./data/_Fields";

export type LInteractionReplyOptions = LocalizableMessageFields & Omit<InteractionReplyOptions, keyof LocalizableMessageFields>;

export class LocalizableInteractionReplyOptionsAdapter {
	private data: LInteractionReplyOptions;

	public constructor(data: LInteractionReplyOptions) {
		this.data = data;
	}

	public build(locale: LocaleString): InteractionReplyOptions {
		const { components, content, embeds, ...x } = this.data;

		const options: InteractionReplyOptions = { ...x };
		
		if (components) {
			options.components = components.map(component => new LActionRowDataLocalizer(component).localize(locale));
		}

		if (content) {
			options.content = Localizer(content, locale);
		}

		if (embeds) {
			options.embeds = embeds.map(e => new LocalizableAPIEmbedAdapter(e).build(locale));
		}

		return options;
	}
};