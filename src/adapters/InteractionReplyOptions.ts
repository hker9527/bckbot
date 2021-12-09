import { SlashCommandResult } from "@type/SlashCommand";
import { BaseCommandInteraction, MessageButton, MessageSelectMenu, WebhookEditMessageOptions } from "discord.js";

export const InteractionReplyOptionsAdapter = (result: SlashCommandResult): WebhookEditMessageOptions => {
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
                                    label: "label" in component ? component.label : undefined,
                                    style: component.style,
                                    url: component.style == "LINK" ? component.url : undefined,
                                } as MessageButton;
                            } else {
                                return {
                                    ...base,
                                    maxValues: component.max_values,
                                    minValues: component.min_values,
                                    placeholder: component.placeholder,
                                    options: component.options.map(option => ({
                                        default: option!.default ?? false,
                                        description: option!.description ?? null,
                                        emoji: option!.emoji ?? null,
                                        label: option!.label,
                                        value: option!.value
                                    }))
                                } as MessageSelectMenu;
                            }
                        })
                    }
                });
                break;
            default:
                ret[key] = result[key];
                break;
        }
    }
    
    return ret as WebhookEditMessageOptions;
}