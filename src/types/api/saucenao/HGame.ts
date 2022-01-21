import { Zod } from "@type/Zod";
import { z } from "zod";

export const ZAPISaucenaoHGame = new Zod(z.object({
	title: z.string(),
	company: z.string(),
	getchu_id: z.string()
}));
