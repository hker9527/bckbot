import { Dictionary } from "@type/Dictionary";
import glob from "glob";
import i18next from "i18next";

export enum Languages {
	English = "en",
	Taiwanese = "tw",
	Japanese = "ja"
};

export const i18init = async () => {
	const resources: Dictionary<any> = {};
	const fileList = glob.sync(`./res/i18n/*.json`);
	for (let file of fileList) {
		const fileName = file.split("/").pop()!.split(".")[0];
		const tmp = require(`@root/${file}`);
		resources[fileName] = { translation: tmp };
	}

	await i18next.init({
		fallbackLng: "en",
		resources
	});
};

export const getString = <T>(key: T, lng: Languages, options?: Dictionary<string | number>): T => {
	return (typeof key === "string" ? i18next.t(key, { interpolation: { escapeValue: false }, lng, ...options }) : key) as T;
};