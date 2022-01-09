import { isZod } from "@app/utils";
import { z } from "zod";

export const ZLocalizerData = z.object({
	key: z.string().min(1),
	data: z.record(z.any()).optional()
});

export const ZLocalizable = z.union([
	ZLocalizerData,
	z.string().min(1)
]);

export type LocalizerData = z.infer<typeof ZLocalizerData>;
export type Localizable = z.infer<typeof ZLocalizable>;

export const isLocalizable = (o: unknown): o is Localizable => {
	return isZod(o, ZLocalizable);
};