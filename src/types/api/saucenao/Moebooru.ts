import { Zod } from "@type/Zod";
import { z } from "zod";

export const ZAPISaucenaoMoebooru = new Zod(z.object({
	ext_urls: z.array(z.string().url()),
	danbooru_id: z.number().optional(),
	gelbooru_id: z.number().optional(),
	konachan_id: z.number().optional(),
	yandere_id: z.number().optional(),
	sankaku_id: z.number().optional(),
	creator: z.string(),
	material: z.string(),
	characters: z.string(),
	source: z.string()
}));
