import { getString, Languages } from "@app/i18n";
import { SlashCommandResult } from "@type/SlashCommand";
import { MessageButton, MessageSelectMenu, WebhookEditMessageOptions } from "discord.js";

const getStringOptional = (key: string | undefined, locale: Languages, data?: any) => {
    return typeof key === "string" ? getString(key, locale, data) : undefined;
}

export const InteractionReplyOptionsAdapter = (result: SlashCommandResult, locale: Languages): WebhookEditMessageOptions => {
    const ret: any = {};
    for (const _key in result) {
        const key = _key as keyof typeof result;

        switch (key) {
            case "components":
                ret[key] = result[key]?.map(row => {
                    return {
                        type: "ACTION_ROW",
                        components: row.map(component => {
                            const base = {
                                type: component.type,
                                customId: "custom_id" in component ? component.custom_id : null,
                                disabled: component.disabled ?? false,
                            };
                            if (component.type == "BUTTON") {
                                return {
                                    ...base,
                                    emoji: component.emoji,
                                    label: getStringOptional(component.label, locale),
                                    style: component.style,
                                    url: component.style == "LINK" ? component.url : undefined,
                                } as MessageButton;
                            } else {
                                return {
                                    ...base,
                                    maxValues: component.max_values,
                                    minValues: component.min_values,
                                    placeholder: getStringOptional(component.placeholder, locale),
                                    options: component.options.map(option => ({
                                        default: option!.default ?? false,
                                        description: option!.description ?? null,
                                        emoji: option!.emoji ?? null,
                                        label: getStringOptional(option!.label, locale),
                                        value: option!.value
                                    }))
                                } as MessageSelectMenu;
                            }
                        })
                    }
                });
                break;
            case "content":
                if (typeof result.content === "string") {
                    ret.content = result.content;
                } else if (result.content) {
                    ret.content = getString(result.content.key, locale, result.content.data);
                }
                
                break;
            case "embeds":
                // TODO: Localize embeds
            default:
                ret[key] = result[key];
                break;
        }
    }
    
    return ret as WebhookEditMessageOptions;
}