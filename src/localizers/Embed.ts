import { Languages } from "@app/i18n";
import { isZod } from "@app/utils";
import { Embed } from "@type/Message/Embed";
import { Localizer } from ".";
import { ZLocalizable } from "./Data";

export const EmbedLocalizer = (embed: Embed, locale: Languages): Embed => {
	if (embed.author) {
		if (isZod(embed.author, ZLocalizable)) {
			embed.author = {
				name: embed.author
			};
		}

		embed.author.name = Localizer(embed.author.name, locale);
	}

	if (embed.title) embed.title = Localizer(embed.title, locale);
    
	if (embed.description) embed.description = Localizer(embed.description, locale);
    
	if (embed.footer) {
		if (isZod(embed.footer, ZLocalizable)) {
			embed.footer = {
				text: embed.footer
			};
		}
		
		embed.footer.text = Localizer(embed.footer.text, locale);
	}
    
	if (embed.provider) embed.provider.name = Localizer(embed.provider.name, locale);
    
	if (embed.fields) {
		for (const field of embed.fields) {
			field.name = Localizer(field.name, locale);
			field.value = Localizer(field.value, locale);
		}
	}
    
	return embed;
}