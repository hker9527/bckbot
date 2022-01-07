import { MessageComponents } from "@type/Message/MessageComponents"
import {SlashCommand } from "@type/SlashCommand";

export const module: SlashCommand = {
    name: "test",
    description: "Ababa",
    onCommand: async () => {
        const component: MessageComponents = [
            [
                {
                    type: "BUTTON",
                    style: "PRIMARY",
                    custom_id: "a",
                    emoji: {
                        id: "485087497907601410"
                    },
                    label: "Primary",
                }, {
                    type: "BUTTON",
                    style: "SECONDARY",
                    custom_id: "b",
                    emoji: {
                        name: "🔥"
                    },
                    label: "Secondary",
                }, {
                    type: "BUTTON",
                    style: "SUCCESS",
                    custom_id: "c",
                    emoji: {
                        id: "463721736597143554"
                    },
                    label: "Success",
                }, {
                    type: "BUTTON",
                    style: "DANGER",
                    custom_id: "d",
                    label: "Danger",
                }, {
                    type: "BUTTON",
                    style: "LINK",
                    url: "https://discord.com/developers/docs/interactions/message-components#buttons",
                    label: "Link",
                }
            ], [
                {
                    type: "SELECT_MENU",
                    custom_id: "menu_single",
                    placeholder: "Single choice",
                    options: [{
                        label: "Default option",
                        value: "a",
                        default: true
                    }, {
                        label: "Another option",
                        value: "b"
                    }, {
                        label: "Another option with emoji",
                        value: "c",
                        emoji: {
                            name: "🍆"
                        }
                    }]
                }
            ], [
                {
                    type: "SELECT_MENU",
                    custom_id: "menu_multiple",
                    placeholder: "Multiple choice",
                    options: [{
                        label: "Default option",
                        value: "a",
                        default: true
                    }, {
                        label: "Another option",
                        value: "b"
                    }, {
                        label: "Another option with emoji",
                        value: "c",
                        emoji: {
                            name: "🍆"
                        }
                    }],
                    min_values: 2,
                    max_values: 3
                }
            ]
        ];
        return {
            content: "Test menu",
            components: component
        };
    }
}