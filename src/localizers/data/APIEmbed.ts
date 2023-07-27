import { Localizer } from "@app/Localizations";
import { L, LocalizerItem } from "../../types/Localizer";
import { APIEmbed, APIEmbedProvider, EmbedAuthorData, EmbedField, EmbedFooterData, LocaleString } from "discord.js";

type LEmbedAuthorData = L<EmbedAuthorData, "name">;
type LEmbedField = L<EmbedField, "name" | "value">;
type LEmbedFooterData = L<EmbedFooterData, "text">;
type LAPIEmbedProvider = L<APIEmbedProvider, "name">;

export interface LAPIEmbed extends Omit<L<APIEmbed, "description" | "title">, "author" | "fields" | "footer" | "provider" | "thumbnail"> {
	author?: LEmbedAuthorData,
	fields?: LEmbedField[],
	footer?: LEmbedFooterData,
	provider?: LAPIEmbedProvider,
	title?: LocalizerItem,
};

export class LocalizableAPIEmbedAdapter {
	private data: LAPIEmbed;

	public constructor(data: LAPIEmbed) {
		this.data = data;
	}

	public build(locale: LocaleString): APIEmbed {
		const { author, description, fields, footer, provider, title, ...x } = this.data;

		const embed: APIEmbed = x;

		if (author) {
			const { name, ...y } = author;
			embed.author = {
				name: Localizer(name, locale),
				...y
			};
		}

		if (description) {
			embed.description = Localizer(description, locale);
		}

		if (fields) {
			embed.fields = fields.map(({ name, value, ...x }) => ({
				name: Localizer(name, locale),
				value: Localizer(value, locale),
				inline: x.inline
			}));
		}

		if (footer) {
			const { text, ...y } = footer;
			embed.footer = {
				text: Localizer(text, locale),
				...y
			};
		}

		if (provider) {
			const { name, ...x } = provider;
			embed.provider = {
				name: name ? Localizer(name, locale) : undefined,
				...x
			};
		}

		if (title) {
			embed.title = Localizer(title, locale);
		}

		return embed;
	}
}