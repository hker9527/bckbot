import { Localizer } from "@app/Localizations";
import { LocaleString } from "discord-api-types/v9";
import { EmbedFieldData, MessageEmbed, MessageEmbedAuthor, MessageEmbedFooter, MessageEmbedOptions, MessageEmbedProvider } from "discord.js";
import { Localizable } from "../types/Localizable";

interface LocalizableMessageEmbedAuthor extends Omit<MessageEmbedAuthor, "name"> {
	name: Localizable
};

interface LocalizableMessageEmbedField extends Omit<EmbedFieldData, "name" | "value"> {
	name: Localizable,
	value: Localizable
};

interface LocalizableMessageEmbedFooter extends Omit<MessageEmbedFooter, "text"> {
	text: Localizable
};

interface LocalizableMessageEmbedProvider extends Omit<MessageEmbedProvider, "name"> {
	name: Localizable
};

export interface LocalizableMessageEmbedOptions extends Omit<MessageEmbedOptions, "author" | "description" | "fields" | "footer" | "image" | "provider" | "title" | "thumbnail"> {
	author?: LocalizableMessageEmbedAuthor,
	description?: Localizable,
	fields?: LocalizableMessageEmbedField[],
	footer?: LocalizableMessageEmbedFooter,
	image?: string,
	provider?: LocalizableMessageEmbedProvider,
	title?: Localizable,
	thumbnail?: string
};

export class LocalizableMessageEmbedAdapter {
	private data: LocalizableMessageEmbedOptions;

	public constructor(data: LocalizableMessageEmbedOptions) {
		this.data = data;
	}

	public build(locale: LocaleString): MessageEmbed {
		const { author, description, fields, footer, image, provider, title, thumbnail, ...x } = this.data;

		const embed: MessageEmbed = new MessageEmbed(x);

		if (author) {
			const { name, ...x } = author;
			embed.author = {
				name: Localizer(name, locale),
				...x
			};
		}

		if (description) {
			embed.description = Localizer(description, locale);
		}

		if (fields) {
			embed.fields = fields.map(({ name, value, ...x }) => ({
				name: Localizer(name, locale),
				value: Localizer(value, locale),
				inline: x.inline ?? false
			}));
		}

		if (footer) {
			const { text, ...x } = footer;
			embed.footer = {
				text: Localizer(text, locale),
				...x
			};
		}

		if (image) {
			embed.image = {
				url: image
			};
		}

		if (provider) {
			const { name, ...x } = provider;
			embed.provider = {
				name: Localizer(name, locale),
				...x
			};
		}

		if (title) {
			embed.title = Localizer(title, locale);
		}

		if (thumbnail) {
			embed.thumbnail = {
				url: thumbnail
			};
		}

		return embed;
	}
}