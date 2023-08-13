import { z } from "zod";
import { Zod } from "@type/Zod";

const SizeSchema = z.object({
	height: z.number(),
	width: z.number()
});

const BaseMediaSchema = z.object({
	altText: z.string().nullable(),
	size: SizeSchema,
	thumbnail_url: z.string(),
	url: z.string()
});

const ImageMediaSchema = BaseMediaSchema.extend({
	type: z.literal("image")
});

const VideoMediaSchema = BaseMediaSchema.extend({
	duration_millis: z.number(),
	type: z.literal("video")
});

const VXTwitterSchema = z.object({
	conversationID: z.string(),
	date: z.string(),
	date_epoch: z.number(),
	hashtags: z.array(z.string()),
	likes: z.number(),
	mediaURLs: z.array(z.string()),
	media_extended: z.array(z.union([ImageMediaSchema, VideoMediaSchema])),
	replies: z.number(),
	retweets: z.number(),
	text: z.string(),
	tweetID: z.string(),
	tweetURL: z.string(),
	user_name: z.string(),
	user_screen_name: z.string()
});

export const ZAPIVXTwitter = new Zod(VXTwitterSchema);

export type APIVXTwitter = z.infer<typeof VXTwitterSchema>;
