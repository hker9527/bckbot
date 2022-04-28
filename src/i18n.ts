import { Dictionary } from "@type/Dictionary";
import glob from "glob";
import i18next from "i18next";

export enum Languages {
	English = "en",
	Taiwanese = "tw",
	Japanese = "ja"
}

export const parseLocaleString = (str: string) => {
	switch (str) {
		case "en-US":
		case "en-GB":
			return Languages.English;
		case "zh-CN":
		case "zh-TW":
			return Languages.Taiwanese;
		case "ja":
			return Languages.Japanese;
		default:
			return null;
	}
};

export const getLocale = (type: "user" | "channel" | "guild", id: string): Languages | null => {
	return Languages.English;
};

export const setLocale = (type: "user" | "channel" | "guild", id: string, language?: Languages) => {
	
};

export const i18init = async () => {
	const resources: Dictionary<any> = {};
	const fileList = glob.sync("./res/i18n/*.json");
	for (let file of fileList) {
		const fileName = file.split("/").pop()!.split(".")[0];
		const tmp = await import(`@root/${file}`);
		resources[fileName] = { translation: tmp };
	}

	await i18next.init({
		fallbackLng: "en",
		resources
	});
};

export const getString = <T>(key: T, language: Languages, options?: Dictionary<string | number>): T => {
	return (typeof key === "string" ? i18next.t(key, { interpolation: { escapeValue: false }, lng: language, ...options }) : key) as T;
};