import { num2str } from "@app/utils";
import type { LAPIEmbed } from "@localizer/data/APIEmbed";
import type { LActionRowData } from "@localizer/data/ActionRowData";
import type { StealthModule } from "@type/StealthModule";
import { ZAPIFXTwitter } from "@type/api/FXTwitter";
import { find } from "linkifyjs";
import { Logger } from "tslog";

const logger = new Logger({
	name: "twitter",
	minLevel: Bun.env.NODE_ENV === "production" ? 3 : 0
});

export const fetchTweet = async (url: URL) => {
	const sublogger = logger.getSubLogger({
		name: "fetchTweet"
	});
	
	let response: string | null = null;

	try {
		const [, author, , statusId] = url.pathname.split("/");
		
		response = await (await fetch(`https://api.fxtwitter.com/${author}/status/${statusId}`)).text();

		const json = JSON.parse(response);
		sublogger.trace(json);

		if (ZAPIFXTwitter.check(json, false)) {
			return json.tweet;
		}
	} catch (e) {
		logger.error(e);
		sublogger.trace(response);

		return null;
	}
};

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

		logger.debug("Found twitter link", url.href);

		const vanilla = /^(www\.)?(twitter|x)\.com$/.test(url.hostname);

		// Fetch response in background
		const [hasImageEmbed, json] = await Promise.all([
			new Promise<boolean>(async (resolve) => {
				// Wait for embed to populate
				await Bun.sleep(2000);

				// Fetch newest version message (Reload embeds)
				obj.message = await obj.message.channel.messages.fetch(obj.message.id);

				resolve(obj.message.embeds.some((embed) => (embed.image?.width ?? 0) > 0 && (embed.image?.height ?? 0) > 0));
			}),
			fetchTweet(url)
		]);

		logger.debug("hasImageEmbed", hasImageEmbed);

		if (!json) {
			logger.debug("Failed to get tweet data");
			return false;
		}

		const images = json.media?.photos ?? [];
		const videos = json.media?.videos ?? [];

		logger.debug("images", images.length);
		logger.debug("videos", videos.length);

		const imageUrls = [
			...images.map((image) => image.url),
			...videos.map((video) => video.thumbnail_url)
		];

		if (vanilla) {
			if (!json.quote) {
				if (hasImageEmbed && images.length === 1) {
					logger.debug("Rejected: Vanilla twitter with only 1 image");
					return false;
				}
				if (images.length === 0) {
					logger.debug("Rejected: Vanilla twitter with no images and quotes");
					return false;
				}
			}
		}

		if (images.length < 2 && !vanilla) {
			logger.debug("Rejected: Fixup sites with less than 2 images");
			return false;
		}

		if (json.possibly_sensitive && "nsfw" in obj.message.channel && !obj.message.channel.nsfw) {
			logger.debug("Rejected: NSFW tweet in SFW channel");
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
				const result = {
					content: json.url.replace("twitter.com", "fxtwitter.com").replace("x.com", "fixupx.com"),
					components
				};

				logger.debug("Accepted (Video)");
				logger.trace(result);

				return {
					type: "reply",
					result: result
				};
			} else {
				logger.debug("Rejected: Fixup sites with videos");
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

		if (json.quote) {
			if (json.quote.media?.photos) {
				embeds[0].thumbnail = {
					url: json.quote.media.photos[0].url
				};
			} else if (json.quote.media?.videos) {
				embeds[0].thumbnail = {
					url: json.quote.media.videos[0].thumbnail_url
				};
			}
		}

		try {
			await obj.message.suppressEmbeds();
		} catch (e) {
			logger.error("Failed to suppress embeds", e);
			// TODO: Remind user to enable Manage Messages permission
		}

		logger.debug("Accepted");
		logger.trace({
			embeds,
			components
		});

		return {
			type: "reply",
			result: {
				embeds,
				components
			}
		};
	}
};