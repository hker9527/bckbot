import { Zod } from "@type/Zod";
import { z } from "zod";

export const ZAPISaucenaoBase = new Zod(z.object({
	ext_urls: z.array(z.string().url())
}));
