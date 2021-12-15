import { Embed } from "@type/Message/Embed";
import { ZMessageComponents } from "@type/Message/MessageComponents";
import { z } from "zod";
import { ZLocalizable } from "./Data";

export const ZLocalizableMessageFields = z.object({
	content: ZLocalizable.optional(),
	components: ZMessageComponents.optional(),
	embeds: z.custom<Embed>().array().optional()
});
export type LocalizableMessageFields = z.infer<typeof ZLocalizableMessageFields>;
export type LocalizableMessage<T> = Omit<T, keyof LocalizableMessageFields> & LocalizableMessageFields;
