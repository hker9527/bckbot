import { debug } from "@app/Reporting";
import { num2str } from "@app/utils";
import type { LAPIEmbed } from "@localizer/data/APIEmbed";
import type { LActionRowData } from "@localizer/data/ActionRowData";
import type { StealthModule } from "@type/StealthModule";
import type { APIFXTwitter } from "@type/api/FXTwitter";
import { ZAPIFXTwitter } from "@type/api/FXTwitter";
import { find } from "linkifyjs";

export const twitter: StealthModule = {
	name: "twitter",
	event: "messageCreate",
	action: async (obj) => {
		const url = find(obj.message.content)
			.filter(result => result.type === "url")
			.map(result => new URL(result.href))
			.filter(url => 
				[
					"vxtwitter.com",
					"fixvx.com",
					"fxtwitter.com",
					"fixupx.com",
					"twittpr.com",
					"twitter.com",
					"x.com"
				].some(domain => url.hostname.endsWith(domain))
			)[0];

		if (!url) {
			return false;
		}

		const vanilla = /^(www\.)?(twitter|x)\.com$/.test(url.hostname);

		// Fetch response in background
		const [hasEmbed, json] = await Promise.all([
			new Promise<boolean>(async (resolve) => {
				// Wait for embed to populate
				await Bun.sleep(2000);

				// Fetch newest version message (Reload embeds)
				obj.message = await obj.message.channel.messages.fetch(obj.message.id);

				resolve(obj.message.embeds.length > 0);
			}),
			new Promise<APIFXTwitter["tweet"] | null>(async (resolve) => {
				const [, author, , statusId] = url.pathname.split("/");

				let response: string | null = null;
				try {
					response = await (await fetch(`https://api.fxtwitter.com/${author}/status/${statusId}`)).text();
					const json = JSON.parse(response);
					if (ZAPIFXTwitter.check(json, false)) {
						resolve(json.tweet);
					}
				} catch (e) {
					debug("twitter", `Failed to parse response ${response}: ${e}`);
					resolve(null);
				}
			})
		]);

		if (vanilla && hasEmbed || !json) {
			return false;
		}

		const images = json.media?.photos ?? [];
		const videos = json.media?.videos ?? [];

		const imageUrls = [
			...images.map((image) => image.url),
			...videos.map((video) => video.thumbnail_url)
		];

		// Fixup sites looks fine for less than 2 images
		if (images.length < 2 && !vanilla) {
			return false;
		}

		const components = [
			{
				type: "ActionRow",
				components: [
					{
						type: "Button",
						label: {
							key: "twitter.originalTweetButton"
						},
						style: "Link",
						url: json.url
					}
				]
			}
		] as LActionRowData[];

		// Workaround for showing videos
		if (videos.length > 0) {
			if (vanilla) {
				// Vanilla twitter can't display videos
				return {
					type: "reply",
					result: {
						content: json.url.replace("twitter.com", "fxtwitter.com"),
						components
					}
				};
			} else {
				// Fixup sites can display videos by itself
				return false;
			}
		}

		let embeds: LAPIEmbed[] = [
			{
				author: {
					name: `${json.author.name} (@${json.author.screen_name})`,
					iconURL: json.author.avatar_url,
					url: json.author.url
				},
				color: 0x1DA1F2,
				description: json.text + (json.quote ? `\n>>> **${json.quote.author.name} (@${json.quote.author.screen_name})**\n${json.quote.text}` : ""),
				footer: {
					text: `❤️ ${num2str(json.likes)} 🔁 ${num2str(json.retweets)} 🗨️ ${num2str(json.replies)}${json.views ? " 👀 " + num2str(json.views) : ""}`,
					iconURL: "https://cdn-icons-png.flaticon.com/512/179/179342.png"
				},
				timestamp: new Date(json.created_timestamp * 1000).toISOString(),
				url: json.url
			}
		];

		if (imageUrls.length > 0) {
			embeds[0].image = {
				url: imageUrls[0]
			};

			embeds = embeds.concat(imageUrls.splice(1).map((imageUrl) => ({
				image: {
					url: imageUrl
				},
				url: json.url
			})));
		}

		try {
			await obj.message.suppressEmbeds();
		} catch (e) { }

		return {
			type: "reply",
			result: {
				embeds,
				components
			}
		};
	}
};