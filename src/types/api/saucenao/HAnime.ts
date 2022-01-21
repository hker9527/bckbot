import { Zod } from "@type/Zod";
import { z } from "zod";

export const ZAPISaucenaoHAnime = new Zod(z.object({
	ext_urls: z.array(z.string().url()),
	source: z.string(),
	anidb_aid: z.number(),
	part: z.string(),
	year: z.string(),
	est_time: z.string()
}));
