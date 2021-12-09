import { getString, Languages } from "@app/i18n";
import { SlashCommandResult } from "@type/SlashCommand";
import { MessageButton, MessageSelectMenu, WebhookEditMessageOptions } from "discord.js";

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
                                    label: getString(component.label, locale),
                                    style: component.style,
                                    url: component.style == "LINK" ? component.url : undefined,
                                } as MessageButton;
                            } else {
                                return {
                                    ...base,
                                    maxValues: component.max_values,
                                    minValues: component.min_values,
                                    placeholder: getString(component.placeholder, locale),
                                    options: component.options.map(option => ({
                                        default: option!.default ?? false,
                                        description: option!.description ?? null,
                                        emoji: option!.emoji ?? null,
                                        label: getString(option!.label, locale),
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
                if (result.embeds) {
                    for (const embed of result.embeds) {
                        embed.title = getString(embed.title, locale);
                        embed.description = getString(embed.description, locale);
                        if (embed.footer) embed.footer.text = getString(embed.footer.text, locale);
                        if ("provider" in embed && embed.provider) embed.provider.name = getString(embed.provider.name, locale);
                        if (embed.fields) {
                            for (const field of embed.fields) {
                                field.name = getString(field.name, locale);
                            }
                        }
                    }
                }
                ret.embeds = result.embeds;
                break;
            default:
                ret[key] = result[key];
                break;
        }
    }

    return ret as WebhookEditMessageOptions;
}