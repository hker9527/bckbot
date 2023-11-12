import { LocalizerItem } from "@type/Localizer";
import { LocaleString, LocalizationMap } from "discord-api-types/v10";
import { readdirSync } from "fs";
import i18next from "i18next";
import { error } from "./Reporting";

const resources: Partial<Record<LocaleString, { translation: Record<string, Record<string, string>> }>> = {};

for (const file of readdirSync("./res/i18n/")) {
	const res = await Bun.file(`./res/i18n/${file}`).json() as Record<string, Record<string, string>>;
	const locale = file.split(".")[0] as LocaleString;
	resources[locale] = { translation: res };
}

i18next.init({
	resources
});

export const getString = (key: string, locale: LocaleString, options?: Record<string, string | number>) => {
	while (!i18next.isInitialized);

	// Locale fallback
	switch (locale) {
		case "en-GB":
			locale = "en-US";
			break;
		case "zh-CN":
			locale = "zh-TW";
			break;
		default:
			if (!i18next.exists(key, { lng: locale })) {
				locale = "en-US";
			}
			break;
	}

	if (!key.includes("$t") && !i18next.exists(key, { lng: locale })) {
		error("getString", `${key} @ ${locale} does not exist!`);
	}

	return i18next.t(key, { interpolation: { escapeValue: false }, lng: locale, ...options });
};

export const Localizer = (localizable: LocalizerItem, locale: LocaleString) => {
	if (typeof localizable === "string") {
		return localizable;
	}

	return getString(localizable.key, locale, localizable.data);
}

const getLocalizationMap = (key: string) => {
	const map: LocalizationMap = {};

	for (const _locale in resources) {
		const locale = _locale as LocaleString;
		if (locale === "en-US" || !i18next.exists(key, { lng: locale })) continue;
		map[locale] = getString(key, locale);
	}

	return map;
};

export const getName = (commandName: string, optionName?: string) => {
	return {
		name: getString(`${commandName}.${optionName ? `_${optionName}` : ""}_name`, "en-US"),
		nameLocalizations: getLocalizationMap(`${commandName}.${optionName ? `_${optionName}` : ""}_name`)
	};
};

export const getDescription = (commandName: string, optionName?: string) => {
	return {
		description: getString(`${commandName}.${optionName ? `_${optionName}` : ""}_description`, "en-US"),
		descriptionLocalizations: getLocalizationMap(`${commandName}.${optionName ? `_${optionName}` : ""}_description`)
	};
};