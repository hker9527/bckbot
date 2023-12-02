const flag = process.env.NODE_ENV !== "production";

const getPrefix = () => {
	const error = new Error();
	const stack = error.stack!.split("\n");
	const path = stack[3].trim().split(" ").pop();

	// Replace base path
	return `[${path!.replace(process.cwd() + "/", "").replace(/\(|\)/g, "")}]`;
};

export const report = (string: string) => {
	console.log(`${getPrefix()} ${string}`);
};

export const debug = (tag: string, e: unknown) => {
	if (flag) console.debug(`${getPrefix()} [${tag}] ${e}`);
};

export const error = (tag: string, e: unknown) => {
	console.error(`${getPrefix()} [${tag}] ${e}`);
};