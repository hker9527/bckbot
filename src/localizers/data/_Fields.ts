import type { LocalizerItem } from "@type/Localizer";
import type { LActionRowData } from "./ActionRowData";
import type { LAPIEmbed } from "./APIEmbed";

export interface LocalizableMessageFields {
	components?: LActionRowData[],
	content?: LocalizerItem,
	embeds?: LAPIEmbed[]
};