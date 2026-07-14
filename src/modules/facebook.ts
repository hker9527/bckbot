import { t } from "@app/i18n/token";
import type { StealthModule } from "@type/StealthModule";
import type { ActionRowData, MessageActionRowComponentData } from "discord.js";
import { ButtonStyle, ComponentType } from "discord.js";
import { find } from "linkifyjs";
import { Logger } from "tslog";

const logger = new Logger({
	name: "facebook",
	minLevel: Bun.env.NODE_ENV === "production" ? 3 : 0
});

export const facebook: StealthModule = {
	name: "facebook",
	event: "messageCreate",
	action: async (obj) => {
		const url = find(obj.message.content)
			.filter(result => result.type === "url")
			.map(result => new URL(result.href))
			.filter(url => 
				[
					"facebook.com",
					"www.facebook.com",
					"m.facebook.com"
				].includes(url.hostname)
			)[0];

		if (!url) {
			return false;
		}

		// Validate path based on Facebed supported paths
		const path = url.pathname;
		const isSupported = 
			/^\/groups\/.+/.test(path) ||
			path.startsWith("/permalink.php") ||
			path.startsWith("/story.php") ||
			/^\/.+\/posts\/.+/.test(path) ||
			path.startsWith("/photo") ||
			path.startsWith("/reel") ||
			path.startsWith("/watch") ||
			path.startsWith("/share") ||
			path.startsWith("/videos");

		if (!isSupported) {
			logger.debug("Rejected: Unsupported Facebook path", path);
			return false;
		}

		logger.debug("Found facebook link", url.href);

		// Construct Facebed URL
		const facebedUrl = new URL(url.href);
		facebedUrl.hostname = "facebed.com";

		// Fetch response in background
		const [html, ] = await Promise.all([
			(async () => {
				try {
					return fetch(facebedUrl.href, {
						headers: {
							"User-Agent": "Mozilla/5.0 (compatible; BckBot; +https://github.com/hker9527/bckbot)"
						}
					}).then(r => r.text());
				} catch (e) {
					logger.error("Failed to check validity", e);
					return null;
				}
			})(),
			new Promise<boolean>(async (resolve) => {
				try {
					// Wait for Discord to attempt embedding
					await Bun.sleep(2000);
					
					// Re-fetch message to check for embeds
					obj.message = await obj.message.channel.messages.fetch(obj.message.id);

					// Check if we already have a valid image/video embed
					const hasValidEmbed = obj.message.embeds.some(embed => 
						(embed.image || embed.video || embed.thumbnail)
					);

					if (hasValidEmbed) {
						// Optional: You could still replace it if you think Facebed is better, 
						// but to avoid spam, we might want to skip if Discord did a good job.
						// However, Facebook embeds are often just thumbnails. 
						// For now, let's proceed with replacement as Facebed is likely preferred.
						logger.debug("Message has embed, but forcing Facebed for better quality");
					}
					resolve(hasValidEmbed);
				} catch (e) {
					logger.error("Error checking message embeds", e);
					resolve(false);
				}
			})
		]);

		if (html === null) {
			logger.debug("Rejected: Failed to fetch Facebed URL");
			return false;
		}
		
		if (html.includes("Log in or sign up to view")) {
			logger.debug("Rejected: Facebed requires login for this content. Not found?");
			return false;
		}

		/* 
			<meta property="og:title" content="方吉君速報-我笑故我在"/>
			<meta property="og:description" content="你幹嘛用這麼萌的姿勢在等著我呢!!??"/>
			<meta property="og:site_name" content="facebed by pi.kt
	⌚ 2026/02/01 12:36:43 UTC+07
	❤ 258 • 💬 4 • 🔁 22"/>
			<meta property="og:url" content="https://www.facebook.com/reel/1291147629701426"/>
		*/

		/* Embed component with video
		
		[
    {
        "type": 17,
        "id": 1,
        "accent_color": null,
        "components": [
            {
                "type": 12,
                "id": 2,
                "items": [
                    {
                        "media": {
                            "id": "1468122329031770247",
                            "url": "https://ifx.up.railway.app/p/DUQKICCivUt/media/0",
                            "proxy_url": "https://images-ext-1.discordapp.net/external/HLdFKFSNzPfufo4E_tdfNuuz3ttjY8E0wKsRiZ_qK5s/https/ifx.up.railway.app/p/DUQKICCivUt/media/0",
                            "width": 720,
                            "height": 1280,
                            "placeholder": "o/cJHAZqNmb3WGRneGmYcIYfOA==",
                            "placeholder_version": 1,
                            "content_scan_metadata": {
                                "version": 4,
                                "flags": 0
                            },
                            "content_type": "video/mp4",
                            "loading_state": 2,
                            "flags": 0
                        },
                        "description": null,
                        "spoiler": false
                    }
                ]
            },
            {
                "type": 10,
                "id": 6,
                "content": "-# <:instagram:1407043421599699036>"
            }
        ],
        "spoiler": false
    }
]*/
		const components: ActionRowData<MessageActionRowComponentData>[] = [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: t("facebook.originalPostButton"), // Make sure to add this key to localization if needed, or use string
						style: ButtonStyle.Link,
						url: url.href
					}
				]
			}
		];

		try {
			await obj.message.suppressEmbeds();
		} catch (e) {
			logger.error("Failed to suppress embeds", e);
		}

		logger.debug("Accepted");
		
		return {
			type: "reply",
			result: {
				content: facebedUrl.href,
				components
			}
		};
	}
};
