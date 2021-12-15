import { getString, Languages } from "@app/i18n";
import { Localizable } from "./Data";

export const Localizer = (data: Localizable, locale: Languages): string => {
    if (typeof data === "string") {
        return data;
    }
    return getString(data.key, locale, data.data);
}