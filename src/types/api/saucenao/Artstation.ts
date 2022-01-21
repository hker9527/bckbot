import { Zod } from "@type/Zod";
import { z } from "zod";

export const ZAPISaucenaoArtstation = new Zod(z.object({
	title: z.string(),
	as_project: z.string(),
	author_name: z.string(),
	author_url: z.string()
}));
