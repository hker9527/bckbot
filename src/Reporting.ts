const flag = !!process.env.DEBUG;

export const debug = (tag: string, e: unknown) => {
	if (flag) console.debug(`[${tag}] ${e}`);
};

export const error = (tag: string, e: unknown) => {
	if (flag) console.error(`[${tag}] ${e}`);
};