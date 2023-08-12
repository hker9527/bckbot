import { StealthModule } from "@type/StealthModule";
import { moebooru } from "./moebooru";
import { pixiv } from "./pixiv";
import { scam } from "./scam";

export const modules: StealthModule[] = [
	moebooru,
	pixiv,
	scam
]