import { Zod } from "@type/Zod";
import { z } from "zod";

export const ZAPISaucenaoPawoo = new Zod(z.object({
	ext_urls: z.array(z.string().url()),
	created_at: z.string(),
	pawoo_id: z.number(),
	pawoo_user_acct: z.string(),
	pawoo_user_username: z.string(),
	pawoo_user_display_name: z.string()
}));
