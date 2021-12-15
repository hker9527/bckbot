import { ComponentLocalizer } from "@localizer/Component";
import { EmbedLocalizer } from "@localizer/Embed";
import { Localizable, ZLocalizable } from "@localizer/Data";
import { MessageButton, MessageSelectMenu, MessageEmbed, MessageOptions } from "discord.js";
import { Languages } from "@app/i18n";
import { Localizer } from "@localizer/index";
import { isZod } from "@app/utils";
import { LocalizableMessage } from "@localizer/MessageFields";
import { MessageComponentButton } from "./MessageComponents";

export abstract class Result<T extends MessageOptions> {
	protected _result: LocalizableMessage<T>;

	constructor(__result: LocalizableMessage<T> | Localizable, id: string) {
		this._result = isZod(__result, ZLocalizable) ? { content: __result } as LocalizableMessage<T> : __result;

		// Add delete button to result
		const deleteButton = [
			{
				type: "BUTTON",
				custom_id: `delete${id}`,
				emoji: {
					name: "🗑️"
				},
				style: "DANGER",
				label: {
					key: "delete"
				}
			} as MessageComponentButton
		];

		if (this._result.components) {
			this._result.components.push(deleteButton);
		} else {
			this._result.components = [deleteButton];
		}
	}

	public localize(locale: Languages) {
		for (const _key in this._result) {
			const key = _key as keyof typeof this._result;

			switch (key) {
				case "components":
					if (this._result.components) {
						for (const row of this._result.components) {
							for (const component of row) {
								ComponentLocalizer(component, locale);
							}
						}
					}
					break;
				case "content":
					if (this._result.content) this._result.content = Localizer(this._result.content, locale);
					break;
				case "embeds":
					if (this._result.embeds) {
						for (const embed of this._result.embeds) {
							EmbedLocalizer(embed, locale);
						}
					}
					break;
				default:
					break;
			}
		}

		return this;
	}

	public build(): T {
		const ret: any = {};

		for (const _key in this._result) {
			const key = _key as keyof LocalizableMessage<T>;

			switch (key) {
				case "components":
					ret.components = this._result.components?.map(row => {
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
										emoji: component.emoji ?? null,
										label: component.label ?? null,
										style: component.style,
										url: component.style === "LINK" ? component.url : undefined,
									} as MessageButton;
								} else {
									return {
										...base,
										maxValues: component.max_values ?? null,
										minValues: component.min_values ?? null, 
										placeholder: component.placeholder ?? null,
										options: component.options.map(option => ({
											default: option.default ?? false,
											description: option.description ?? null,
											emoji: option.emoji ?? null,
											label: option.label,
											value: option.value
										}))
									} as MessageSelectMenu;
								}
							})
						}
					});
					break;
				case "content":
					ret.content = this._result.content as (string | undefined);
					break;
				case "embeds":
					ret.embeds = this._result.embeds?.map(embed => {
						const {thumbnail, image, ...x} = embed;
						return {
							...x,
							thumbnail: {
								url: thumbnail
							},
							image: {
								url: image
							}
						}
					}) as (MessageEmbed[] | undefined);
					break;
				default:
					(ret as any)[key] = this._result[key];
					break;
			}
		}

		return ret as T;
	}
};