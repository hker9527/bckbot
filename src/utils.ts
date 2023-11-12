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

// Use k, m, ... suffixes for numbers
export const num2str = (num: number) => {
	if (num < 1000) return num.toString();
	const exp = Math.floor(Math.log(num) / Math.log(1000));
	return `${(num / Math.pow(1000, exp)).toFixed(1)}${"kMGTPE"[exp - 1]}`;
};
