import { t } from "@app/i18n/token";
import { extractOgUrl } from "@app/utils";
import type { StealthModule } from "@type/StealthModule";
import type { ActionRowData, MessageActionRowComponentData } from "discord.js";
import { ButtonStyle, ComponentType } from "discord.js";
import { find } from "linkifyjs";
import { Logger } from "tslog";

const logger = new Logger({
	name: "bilibili",
	minLevel: Bun.env.NODE_ENV === "production" ? 3 : 0
});

// vxbilibili fixes bilibili embeds by inserting "vx" before the domain:
//   www.bilibili.com/video/BVxxx -> www.vxbilibili.com/video/BVxxx
//   b23.tv/xxx                   -> vxb23.tv/xxx
const rewriteHostname = (hostname: string): string | null => {
	if (hostname.endsWith("bilibili.com")) {
		return hostname.replace("bilibili.com", "vxbilibili.com");
	}
	if (hostname === "b23.tv" || hostname.endsWith(".b23.tv")) {
		return hostname.replace("b23.tv", "vxb23.tv");
	}
	return null;
};

// Full-site links must point at embeddable content. b23.tv short links are
// opaque redirects, so they are always accepted.
const isSupportedBilibiliPath = (hostname: string, path: string): boolean => {
	// Subdomains (live streams, user spaces) carry the content in the host.
	if (/^(live|space|t)\.bilibili\.com$/.test(hostname)) {
		return true;
	}

	return (
		path.startsWith("/video/") ||
		path.startsWith("/bangumi/") ||
		path.startsWith("/opus/") ||
		path.startsWith("/read/") ||
		path.startsWith("/festival/")
	);
};

export const bilibili: StealthModule = {
	name: "bilibili",
	event: "messageCreate",
	action: async (obj) => {
		const url = find(obj.message.content)
			.filter(result => result.type === "url")
			.map(result => new URL(result.href))
			.filter(url =>
				url.hostname.endsWith("bilibili.com") ||
				url.hostname === "b23.tv" ||
				url.hostname.endsWith(".b23.tv")
			)[0];

		if (!url) {
			return false;
		}

		logger.debug("Found bilibili link", url.href);

		const isShortLink = url.hostname === "b23.tv" || url.hostname.endsWith(".b23.tv");

		if (!isShortLink && !isSupportedBilibiliPath(url.hostname, url.pathname)) {
			logger.debug("Rejected: Unsupported bilibili path", url.pathname);
			return false;
		}

		const newHostname = rewriteHostname(url.hostname);
		if (!newHostname) {
			logger.debug("Rejected: Unable to rewrite hostname", url.hostname);
			return false;
		}

		const fixedUrl = new URL(url.href);
		fixedUrl.hostname = newHostname;

		// vxbilibili returns 200 with og metadata for real content, and 4xx
		// ("Video not found" / "Invalid video ID" / "Not found") otherwise.
		// Reject before replacing so dead links keep Discord's default behaviour.
		let html: string;
		try {
			// vxbilibili only serves the og/404 path to bot user-agents; other UAs
			// get a 307 redirect to bilibili.com, which hides the existence signal.
			const res = await fetch(fixedUrl.href, {
				headers: {
					"User-Agent": "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)"
				}
			});
			if (!res.ok) {
				logger.debug("Rejected: vxbilibili reports link does not exist", fixedUrl.href);
				return false;
			}
			html = await res.text();
		} catch (e) {
			logger.error("Failed to check validity", e);
			return false;
		}

		// vxbilibili's og:url is the canonical, tracking-free bilibili link (short
		// links resolved, share/buvid params dropped). Prefer it for the button and
		// the posted proxy link; fall back to the raw rewrite if it is missing.
		const canonical = extractOgUrl(html);
		let content = fixedUrl.href;
		let originalUrl = url.href;
		if (canonical) {
			originalUrl = canonical;
			try {
				const cleanProxy = new URL(canonical);
				const cleanHostname = rewriteHostname(cleanProxy.hostname);
				if (cleanHostname) {
					cleanProxy.hostname = cleanHostname;
					content = cleanProxy.href;
				}
			} catch { /* keep fixedUrl.href */ }
		}

		const components: ActionRowData<MessageActionRowComponentData>[] = [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: t("bilibili.originalVideoButton"),
						style: ButtonStyle.Link,
						url: originalUrl
					}
				]
			}
		];

		try {
			await obj.message.suppressEmbeds();
		} catch (e) {
			logger.error("Failed to suppress embeds", e);
		}

		logger.debug("Accepted", content);

		return {
			type: "reply",
			result: {
				content,
				components
			}
		};
	}
};
