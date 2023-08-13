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
				const images = json.media_extended.filter((media) => media.type === "image");

				if (images.length === 0) {
					return false;
				}

				try {
					await obj.message.suppressEmbeds();
				} catch (e) {}

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
									url: images[0].url
								},
								url: json.tweetURL
							}
						] as APIEmbed[]).concat(images.splice(1).map((image) => ({
							image: {
								url: image.url
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