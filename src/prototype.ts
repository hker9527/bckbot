import { Message, Guild, Locale } from "discord.js";

export const injectPrototype = () => { }; // Turn this file into a module

declare global {
	interface Number {
		inRange: (a: number, b: number) => boolean;
	}

	interface Array<T> {
		unique: () => Array<T>;
	}

	interface BigInt {
		toJSON: () => string;
	}
}

Number.prototype.inRange = function (a: number, b: number) {
	return this.valueOf() > a && this.valueOf() < b;
};

// Prevent being read from loops 
// For example:
// for (let key in array) { ... }

Object.defineProperty(Array.prototype, "unique", {
	enumerable: false,
	writable: true
});

Array.prototype.unique = function () {
	return [...new Set(this)];
};

BigInt.prototype.toJSON = function () {
	return this.toString();
}