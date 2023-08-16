import { sleep } from "@app/utils";
import { StealthModule } from "@type/StealthModule";
import { ZAPIVXTwitter } from "@type/api/VXTwitter";
import { APIEmbed } from "discord.js";

export const twitter: StealthModule = {
	name: "twitter",
	event: "messageCreate",
	pattern: /https?:\/\/(?:www\.)?(twitter|x)\.com\/(?:#!\/)?(\w+)\/status\/(\d+)/,
	action: async (obj) => {
		// Wait for embed to populate
		await sleep(5000);
		
		// Fetch newest version message (Reload embeds)
		obj.message = await obj.message.channel.messages.fetch(obj.message.id);

		// Check if original message has images in embed (Normal behavior)
		if (obj.message.embeds.length > 0 && obj.message.embeds[0].image) {
			return false;
		}

		const statusId = obj.matches!.pop();
		const author = obj.matches!.pop();

		try {
			const response = await (await fetch(`https://api.vxtwitter.com/${author}/status/${statusId}`)).text();
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
									icon_url: `https://unavatar.io/twitter/${json.user_screen_name}`,
									url: `https://twitter.com/${json.user_screen_name}`
								},
								color: 0x1DA1F2,
								// Remove https://t.co/... links
								description: json.text.replace(/https:\/\/t\.co\/\w+/g, ""),
								footer: {
									text: `❤️ ${json.likes} 🔁 ${json.retweets} 🗨️ ${json.replies}`,
									icon_url: "https://cdn-icons-png.flaticon.com/512/179/179342.png"
								},
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
			};
			return false;
		} catch (e) {
			return false;
		}
	}
};