import { z } from "zod";

const ZLocalizerData = z.object({
    key: z.string().min(1),
    data: z.record(z.any())
});

export type LocalizerData = z.infer<typeof ZLocalizerData>;