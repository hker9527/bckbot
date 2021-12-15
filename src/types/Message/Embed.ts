import { Localizable } from "@app/localizers/Data";
import { EmbedFieldData, MessageEmbedAuthor, MessageEmbedFooter, MessageEmbedOptions, MessageEmbedProvider } from "discord.js";

type Modify<T, U> = Omit<T, keyof U> & U;

export type Embed = Modify<MessageEmbedOptions, {
    author?: Localizable | Modify<MessageEmbedAuthor, {
        name: Localizable
    }>;
    description?: Localizable,
    fields?: (Modify<EmbedFieldData, {
        name: Localizable,
        value: Localizable
    }>)[];
    footer?: Localizable | Modify<MessageEmbedFooter, {
        text: Localizable,
    }>;
	thumbnail?: string;
	image?: string;
    provider?: Modify<MessageEmbedProvider, {
        name: Localizable
    }>;
    title?: Localizable;
}>;