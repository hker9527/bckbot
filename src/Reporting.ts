const flag = !!process.env.DEBUG;

export const timeFormat = () => {
	return new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
};

export const report = (string: string) => {
	console.log(`${timeFormat()}\t${string}`);
};

export const debug = (tag: string, e: unknown) => {
	if (flag) report(`[${tag}] ${e}`);
};

export const error = (tag: string, e: unknown) => {
	if (flag) console.error(`[${tag}] ${e}`);
};