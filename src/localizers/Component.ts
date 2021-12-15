import { Languages } from "@app/i18n";
import { MessageComponents } from "@type/Message/MessageComponents";
import { Localizer } from ".";

export const ComponentLocalizer = (component: MessageComponents["0"]["0"], locale: Languages): MessageComponents["0"]["0"] => {
	switch (component.type) {
		case "BUTTON":
			component.label = Localizer(component.label, locale);
			break;
		case "SELECT_MENU":
			if (component.placeholder) component.placeholder = Localizer(component.placeholder, locale);
			component.options.map(option => {
				const { description, ...x } = option;
				return {
					...x,
					description: description && Localizer(description, locale)
				}
			});
			break;
	}

	return component;
};