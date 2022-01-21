import { Zod } from "@type/Zod";
import { z } from "zod";

export const ZAPISaucenaoMangadex = new Zod(z.object({
	ext_urls: z.array(z.string().url()),
	md_id: z.number().optional(),	// "https://mangadex.org/chapter/{{id}}"
	mu_id: z.number().optional(),	// "https://www.mangaupdates.com/series.html?id={{id}}"
	mal_id: z.number().optional(),	// "https://myanimelist.net/manga/{{id}}/"
	source: z.string(),
	part: z.string(),
	artist: z.string(),
	author: z.string()
}));