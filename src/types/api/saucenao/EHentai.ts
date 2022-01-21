import { Zod } from "@type/Zod";
import { z } from "zod";

export const ZAPISaucenaoEHentai = new Zod(z.object({
	source: z.string(),
	creator: z.array(z.string()),
	eng_name: z.string(),
	jp_name: z.string()
}));
