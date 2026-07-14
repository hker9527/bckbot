import type { StealthModule } from "@type/StealthModule";
import { bilibili } from "./bilibili";
import { moebooru } from "./moebooru";
import { pixiv } from "./pixiv";
import { scam } from "./scam";
import { twitter } from "./twitter";

export const modules: StealthModule[] = [
	bilibili,
	moebooru,
	pixiv,
	scam,
	twitter
]