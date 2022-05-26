import { LocalizableMessageActionRowOptions } from "@localizer/MessageActionRowOptions";
import { LocalizableMessageEmbedOptions } from "@localizer/MessageEmbedOptions";
import { Dictionary } from "./Dictionary";

export type Localizable = string | {
	key: string,
	data?: Dictionary<string | number>
};

export type LocalizableFieldNames = "components" | "content" | "embeds";

export interface LocalizableFields {
	components?: LocalizableMessageActionRowOptions[],
	content?: Localizable,
	embeds?: LocalizableMessageEmbedOptions[]
};