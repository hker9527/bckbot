import { LocalizerItem } from "@type/Localizer";
import { LActionRowData } from "./ActionRowData";
import { LAPIEmbed } from "./APIEmbed";

export interface LocalizableMessageFields {
	components?: LActionRowData[],
	content?: LocalizerItem,
	embeds?: LAPIEmbed[]
};