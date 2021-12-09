import { getString, Languages } from "@app/i18n";
import { SlashCommand } from "@type/SlashCommand";

export const module: SlashCommand = {
	name: "language",
	description: "Change the language for the bot",
	options: [
		{
			name: "language",
			description: "The language that you want to change",
			type: "STRING",
			choices: [{
				name: "Unset",
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
				name: "Channel",
				value: "channel"
			}, {
				name: "Guild",
				value: "guild"
			}]
		}
	],
	onCommand: async (interaction) => {
		const language = interaction.options.getString("language", true);
		const target = interaction.options.getString("target", true);

		switch (target) {
			case "channel":
				interaction.channel!.setLocale(language === "na" ? undefined : language as Languages);
				break;
			case "guild":
				interaction.guild!.setLocale(language === "na" ? undefined : language as Languages);
				break;
		}

		return getString("i18n.success", language === "na" ? Languages.English : language as Languages);
	}
};