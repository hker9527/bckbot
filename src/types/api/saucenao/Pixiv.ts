import { Zod } from "@type/Zod";
import { z } from "zod";

export const ZAPISaucenaoPixiv = new Zod(z.object({
	ext_urls: z.array(z.string().url()),
	title: z.string(),
	pixiv_id: z.number(),
	member_name: z.string(),
	member_id: z.number()
}));
