import { Zod } from "@type/Zod";
import { z } from "zod";

export const ZAPISaucenaoHMagazines = new Zod(z.object({
	title: z.string(),
	part: z.string(),
	date: z.string()
}));
