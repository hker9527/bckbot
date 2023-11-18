import type { StealthModule } from "@type/StealthModule";
import { moebooru } from "./moebooru";
import { pixiv } from "./pixiv";
import { scam } from "./scam";
import { twitter } from "./twitter";

export const modules: StealthModule[] = [
	moebooru,
	pixiv,
	scam,
	twitter
]