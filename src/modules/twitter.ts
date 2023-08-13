import { StealthModule } from "@type/StealthModule";
import { ZAPIVXTwitter } from "@type/api/VXTwitter";
import { APIEmbed } from "discord.js";

export const twitter: StealthModule = {
	name: "twitter",
	event: "messageCreate",
	pattern: /https?:\/\/(?:www\.)?twitter\.com\/(?:#!\/)?(\w+)\/status\/(\d+)/,
	action: async (obj) => {
		const statusId = obj.matches!.pop();
		const response = await (await fetch(`https://api.vxtwitter.com/i/status/${statusId}`)).text();

		try {
			const json = JSON.parse(response);
			if (ZAPIVXTwitter.check(json)) {
				await obj.message.suppressEmbeds();
				return {
					type: "send",
					result: {
						embeds: ([
							{
								author: {
									name: `${json.user_name} (@${json.user_screen_name})`,
									icon_url: "https://cdn-icons-png.flaticon.com/512/179/179342.png",
									url: `https://twitter.com/${json.user_screen_name}`
								},
								color: 0x1DA1F2,
								// Remove https://t.co/... links
								description: json.text.replace(/https:\/\/t\.co\/\w+/g, ""),
								timestamp: new Date(json.date_epoch * 1000).toISOString(),
								image: {
									url: json.mediaURLs[0]
								},
								url: json.tweetURL
							}
						] as APIEmbed[]).concat(json.mediaURLs.splice(1).map((url: string) => ({
							image: {
								url
							},
							url: json.tweetURL
						}))) 
					}
				};
			}
			return false;
		} catch (e) {
			return false;
		}
	}
};