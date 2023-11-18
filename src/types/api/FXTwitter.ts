import { z } from "zod";
import { Zod } from "@type/Zod";

const BaseTweetSchema = z.object({
	url: z.string(),
	text: z.string(),
	author: z.object({
		name: z.string(),
		screen_name: z.string(),
		avatar_url: z.string(),
		url: z.string()
	}),
	replies: z.number(),
	retweets: z.number(),
	likes: z.number(),
	created_timestamp: z.number(),
	possibly_sensitive: z.boolean().optional(),
	views: z.number().nullable(),
	replying_to: z.string().nullable(),
	replying_to_status: z.string().nullable(),
	color: z.null(),
	media: z.object({
		photos: z.array(z.object({
			url: z.string()
		})).optional(),
		videos: z.array(z.object({
			thumbnail_url: z.string()
		})).optional()
	}).optional()
});

const TweetSchema = BaseTweetSchema.extend({
	quote: BaseTweetSchema.optional()
});

const FxTwitterSchema = z.object({
	code: z.number(),
	message: z.string(),
	tweet: TweetSchema
});

export const ZAPIFXTwitter = new Zod(FxTwitterSchema);

export type APIFXTwitter = z.infer<typeof FxTwitterSchema>;