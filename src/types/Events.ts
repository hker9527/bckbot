import { Dictionary } from "./Dictionary";
import { StealthModule } from "./StealthModule";

export type Events = Dictionary<Dictionary<{
	module: StealthModule,
	loaded: boolean
}>>