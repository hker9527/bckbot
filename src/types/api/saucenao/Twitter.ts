import { Zod } from "@type/Zod";
import { z } from "zod";

export const ZAPISaucenaoTwitter = new Zod(z.object({
	ext_urls: z.array(z.string().url()),
	created_at: z.string(),
	tweet_id: z.string(),
	twitter_user_id: z.string(),
	twitter_user_handle: z.string()
}));
