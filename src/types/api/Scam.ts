export interface APIScam {
	matches?: ({
		threatType: string;
		platformType: string;
		threat: {
			url: string
		};
		threatEntryMetadata?: {
			entries: ({
				key: string,
				value: string
			})[]
		},
		cacheDuration: string;
		threatEntryType: string;
	})[];
}