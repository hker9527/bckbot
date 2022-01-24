import { Languages } from "@app/i18n";
import { SlashCommand } from "@type/SlashCommand";

export const module: SlashCommand = {
	name: "language",
	description: "Change the bot's language",
	options: [
		{
			name: "language",
			description: "The language that you want to change",
			type: "STRING",
			choices: [{
				name: "Reset all",
				value: "na"
			}, {
				name: "English",
				value: "en"
			}, {
				name: "中文",
				value: "tw"
			}, {
				name: "日本語",
				value: "ja"
			}]
		}, {
			name: "target",
			description: "Choose where to apply",
			type: "STRING",
			choices: [{
				name: "User",
				value: "user"
			}, {
				name: "Channel",
				value: "channel"
			}, {
				name: "Guild",
				value: "guild"
			}]
		}
	],
	onCommand: async (interaction) => {
		const _language = interaction.options.getString("language", true);
		const language = _language === "na" ? undefined : _language as Languages;
		const target = interaction.options.getString("target", true);

		switch (target) {
			case "channel":
				if (interaction.memberPermissions?.has("ADMINISTRATOR")) {
					interaction.channel!.setLocale(language);
				} else {
					return {
						key: "i18n.fail"
					};
				}
				break;
			case "guild":
				if (interaction.memberPermissions?.has("ADMINISTRATOR")) {
					interaction.guild!.setLocale(language);
				} else {
					return {
						key: "i18n.fail"
					};
				}
				break;
			case "user":
				interaction.user.setLocale(language);
				break;
		}

		return {
			key: "i18n.success"
		};
	}
};