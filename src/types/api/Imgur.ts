import { z } from "zod";
import { Zod } from "@type/Zod";

const DataSchema = z.object({
	id: z.string()
});

const ImgurSchema = z.object({
	data: DataSchema,
	success: z.literal(true),
	status: z.literal(200)
});
export const ZAPIImgur = new Zod(ImgurSchema);

export type APIImgur = z.infer<typeof ImgurSchema>;
