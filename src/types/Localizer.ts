export type L<T, U extends keyof T> = {
	[K in keyof T]: K extends U ? LocalizerItem : T[K];
};

export type LocalizerItem = string | {
	key: string,
	data?: Record<string, string | number>
};
