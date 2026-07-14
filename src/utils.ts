import assert from "assert";
import { Decimal } from "decimal.js";

export const round = (number: number, precision = 2) => {
	return parseFloat(new Decimal(number).toFixed(precision));
};

export const random = (low: number, high: number) => {
	if (low === high) return low;
	return (Math.random() * (high - low + 1) + low) | 0;
};

export const arr2obj = <T>(a1: (string | number)[], a2: T[]): Record<string, T> => {
	assert(a1.length === a2.length, `Array length mismatch: ${a1.length} !== ${a2.length}`);
	const out: Record<string, T> = {};
	for (let i = 0; i < a1.length; i++) {
		out[a1[i]] = a2[i];
	}
	return out;
};

export const enumStringKeys = <T extends object>(e: T) => {
	return Object.keys(e).filter(value => isNaN(Number(value))) as (keyof T)[];
};

// Pull the canonical `og:url` out of an HTML document. Embed proxies (facebed,
// vxbilibili) resolve links to a tracking-free canonical URL and expose it here,
// so this is how we recover the "clean" original link. Handles both attribute
// orders (`property` before or after `content`). Returns null if absent.
export const extractOgUrl = (html: string): string | null => {
	const match =
		/<meta[^>]*\bproperty=["']?og:url["']?[^>]*\bcontent=["']([^"']+)["']/i.exec(html) ??
		/<meta[^>]*\bcontent=["']([^"']+)["'][^>]*\bproperty=["']?og:url["']?/i.exec(html);
	return match ? match[1] : null;
};

// Use k, m, ... suffixes for numbers
export const num2str = (num: number) => {
	if (num < 1000) return num.toString();
	const exp = Math.floor(Math.log(num) / Math.log(1000));
	return `${(num / Math.pow(1000, exp)).toFixed(1)}${"kMGTPE"[exp - 1]}`;
};
