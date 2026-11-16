import { getString } from "@app/Localizations";
import type { LocaleString } from "discord.js";
import { decodeToken, isToken } from "./token";

// Single recursive pass that replaces every `t()` sentinel inside an arbitrary
// discord.js options/JSON structure with resolved text for `locale`. Replaces the
// whole `L*` adapter-class tree: discord.js owns the shapes, this just walks them.
export const localize = <T>(node: T, locale: LocaleString): T => {
	if (typeof node === "string") {
		if (isToken(node)) {
			const { key, data } = decodeToken(node);
			return getString(key, locale, data) as unknown as T;
		}
		return node;
	}

	if (Array.isArray(node)) {
		return node.map(child => localize(child, locale)) as unknown as T;
	}

	// Only plain objects: class instances like Buffer attachments must pass through intact
	if (node !== null && typeof node === "object" && [Object.prototype, null].includes(Object.getPrototypeOf(node))) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(node)) {
			out[k] = localize(v, locale);
		}
		return out as T;
	}

	return node;
};
