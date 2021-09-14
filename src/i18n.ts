import { Dictionary } from '@type/Dictionary';
import * as glob from 'glob-promise';

export enum Languages {
	English = "en",
	Taiwanese = "tw",
	Cantonese = "hk",
	Japanese = "jp"
};

type Namespaces = "avatar" | "index" | "magicball" | "migrate" | "osu" | "roll" | "scam" | "slap";

type Translation = {
	[Languages.English]: string;
	[Languages.Taiwanese]?: string;
	[Languages.Cantonese]?: string;
	[Languages.Japanese]?: string;
};

const translations: Dictionary<Dictionary<Translation>> = {};
let ready = false;

export const getString = (namespace: Namespaces, item: string, locale: Languages, obj?: Dictionary<string | number>) => {
	if (!ready) {
		const fileList = glob.sync(`./res/i18n/*.json`);
		for (let file of fileList) {
			const fileName = file.split("/").pop()!.slice(0, -5) as Namespaces;
			const tmp = require(`@root/${file}`) as Dictionary<Translation>;
			translations[fileName] = {};
			for (const key in tmp) {
				translations[fileName][key] = tmp[key];
			}
		}
		ready = true;
	}

	let output = translations[namespace][item][locale] ?? translations[namespace][item].en;
	if (obj) {
		for (const key in obj) {
			output = output!.replace(new RegExp(`!${key}!`, "g"), String(obj[key]));
		}
	}

	const missingArgumentCheck = output.match(/\!.+?\!/g);
	if (missingArgumentCheck == null) {
		return output;
	}
	throw new Error(`Missing argument(s) while fetching locale item ${namespace}.${item}: ${missingArgumentCheck.unique().map(placeholder => placeholder.slice(1, -1)).join(", ")}`);
};