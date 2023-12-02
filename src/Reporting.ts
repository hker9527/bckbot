const flag = process.env.NODE_ENV !== "production";

export const report = (string: string) => {
	console.log(`${string}`);
};

export const debug = (tag: string, e: unknown) => {
	if (flag) console.debug(`[${tag}] ${e}`);
};

export const error = (tag: string, e: unknown) => {
	if (flag) console.error(`[${tag}] ${e}`);
};