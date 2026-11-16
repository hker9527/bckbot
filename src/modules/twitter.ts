import { num2str } from "@app/utils";
import { t } from "@app/i18n/token";
import type { StealthModule } from "@type/StealthModule";
import { ZAPIFXTwitter } from "@type/api/FXTwitter";
import type { APIEmbed, ActionRowData, BaseMessageOptions, MessageActionRowComponentData } from "discord.js";
import { ButtonStyle, ComponentType } from "discord.js";
import { find } from "linkifyjs";
import { createLogger } from "@app/sentry";
import sharp from "sharp";

const logger = createLogger({
	name: "twitter",
	minLevel: Bun.env.NODE_ENV === "production" ? 3 : 0
});

// X serves this generic open graph image in place of the real media when a
// tweet is marked sensitive.
const SENSITIVE_PLACEHOLDER_URL = "https://abs.twimg.com/rweb/ssr/default/v2/og/image.png";

export const isSensitivePlaceholder = (imageUrl?: string) =>
	imageUrl?.split("?")[0] === SENSITIVE_PLACEHOLDER_URL;

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

type Tweet = NonNullable<Awaited<ReturnType<typeof fetchTweet>>>;
type Photo = NonNullable<NonNullable<Tweet["media"]>["photos"]>[number];

// The Discord client merges embeds sharing a url into one card with all their
// images, and a message holds at most 10 embeds.
const IMAGES_PER_PAGE = 10;
const PAGE_PREFIX = "twitter:page:";

const STRIP_MIN_RATIO = 3;
const STITCHED_MAX_SIZE = 4096;
// Webp keeps the gaps and corners transparent, so the strips still look split
const STITCHED_FILENAME = "stitched.webp";
// Relative to the stitched image's long side, so they stay visible once Discord
// scales the image down
const STRIP_GAP_RATIO = 0.006;
const STRIP_RADIUS_RATIO = 0.012;

// Some tweets cut one picture into same-sized thin strips, one per photo slot.
// Returns which way to join them back, or null for a normal set of photos.
export const getStripDirection = (photos: Photo[]): "horizontal" | "vertical" | null => {
	if (photos.length < 2) {
		return null;
	}

	const { width, height } = photos[0];

	if (!width || !height || !photos.every((photo) => photo.width === width && photo.height === height)) {
		return null;
	}

	if (height / width >= STRIP_MIN_RATIO) {
		return "horizontal";
	}

	if (width / height >= STRIP_MIN_RATIO) {
		return "vertical";
	}

	return null;
};

export const stitchStrips = async (photos: Photo[], direction: "horizontal" | "vertical") => {
	const width = photos[0].width!;
	const height = photos[0].height!;
	const horizontal = direction === "horizontal";

	const tiles = await Promise.all(photos.map(async (photo) => {
		const response = await fetch(photo.url);

		if (!response.ok) {
			throw new Error(`Failed to download ${photo.url}: ${response.status}`);
		}

		return Buffer.from(await response.arrayBuffer());
	}));

	const longSide = horizontal
		? Math.max(width * tiles.length, height)
		: Math.max(width, height * tiles.length);
	const gap = Math.max(2, Math.round(longSide * STRIP_GAP_RATIO));
	const radius = Math.min(Math.max(2, Math.round(longSide * STRIP_RADIUS_RATIO)), Math.floor(Math.min(width, height) / 2));
	const mask = Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}"/></svg>`);

	const roundedTiles = await Promise.all(tiles.map((tile) =>
		sharp(tile)
			.resize(width, height, { fit: "cover" })
			.ensureAlpha()
			.composite([{ input: mask, blend: "dest-in" }])
			.png()
			.toBuffer()
	));

	const stride = (horizontal ? width : height) + gap;
	const length = stride * tiles.length - gap;

	const { data, info } = await sharp({
		create: {
			width: horizontal ? length : width,
			height: horizontal ? height : length,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 }
		}
	})
		.composite(roundedTiles.map((input, i) => ({
			input,
			left: horizontal ? i * stride : 0,
			top: horizontal ? 0 : i * stride
		})))
		.raw()
		.toBuffer({ resolveWithObject: true });

	return sharp(data, { raw: info })
		.resize(STITCHED_MAX_SIZE, STITCHED_MAX_SIZE, { fit: "inside", withoutEnlargement: true })
		.webp({ quality: 90 })
		.toBuffer();
};

const getImageUrls = (json: Tweet) => [
	...(json.media?.photos ?? []).map((image) => image.url),
	...(json.media?.videos ?? []).map((video) => video.thumbnail_url)
];

const getPageCount = (imageCount: number) => Math.max(1, Math.ceil(imageCount / IMAGES_PER_PAGE));

const buildEmbeds = (json: Tweet, imageUrls: string[], page: number): APIEmbed[] => {
	const embeds: APIEmbed[] = [
		{
			author: {
				name: `${json.author.name} (@${json.author.screen_name})`,
				icon_url: json.author.avatar_url,
				url: json.author.url
			},
			color: 0x1DA1F2,
			description: json.text + (json.quote ? `\n>>> **${json.quote.author.name} (@${json.quote.author.screen_name})**\n${json.quote.text}` : ""),
			footer: {
				text: `❤️ ${num2str(json.likes)} 🔁 ${num2str(json.retweets)} 🗨️ ${num2str(json.replies)}${json.views ? " 👀 " + num2str(json.views) : ""}`,
				icon_url: "https://cdn-icons-png.flaticon.com/512/179/179342.png"
			},
			timestamp: new Date(json.created_timestamp * 1000).toISOString(),
			url: json.url
		}
	];

	const pageImageUrls = imageUrls.slice(page * IMAGES_PER_PAGE, (page + 1) * IMAGES_PER_PAGE);

	pageImageUrls.forEach((imageUrl, i) => {
		if (i === 0) {
			embeds[0].image = {
				url: imageUrl
			};
			return;
		}

		embeds.push({
			image: {
				url: imageUrl
			},
			url: json.url
		});
	});

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

	return embeds;
};

const buildComponents = (
	json: Tweet,
	page: number,
	pageCount: number
): ActionRowData<MessageActionRowComponentData>[] => {
	const buttons: MessageActionRowComponentData[] = [
		{
			type: ComponentType.Button,
			label: t("twitter.originalTweetButton"),
			style: ButtonStyle.Link,
			url: json.url
		}
	];

	if (pageCount > 1) {
		buttons.push(
			{
				type: ComponentType.Button,
				customId: `${PAGE_PREFIX}${page - 1}`,
				style: ButtonStyle.Secondary,
				emoji: { name: "◀️" },
				disabled: page <= 0
			},
			{
				type: ComponentType.Button,
				customId: "twitter:indicator",
				style: ButtonStyle.Secondary,
				label: `${page + 1} / ${pageCount}`,
				disabled: true
			},
			{
				type: ComponentType.Button,
				customId: `${PAGE_PREFIX}${page + 1}`,
				style: ButtonStyle.Secondary,
				emoji: { name: "▶️" },
				disabled: page >= pageCount - 1
			}
		);
	}

	return [
		{
			type: ComponentType.ActionRow,
			components: buttons
		}
	];
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
		const [imageEmbedCount, json] = await Promise.all([
			new Promise<number>(async (resolve) => {
				// Wait for embed to populate
				await Bun.sleep(2000);

				// Fetch newest version message (Reload embeds)
				obj.message = await obj.message.channel.messages.fetch(obj.message.id);

				// Count how many images the source link already rendered. Sensitive
				// tweets embed a placeholder instead of the real media, which tells
				// us nothing about what the user can actually see.
				resolve(obj.message.embeds.filter((embed) =>
					(embed.image?.width ?? 0) > 0 &&
					(embed.image?.height ?? 0) > 0 &&
					!isSensitivePlaceholder(embed.image?.url)
				).length);
			}),
			fetchTweet(url)
		]);

		const hasImageEmbed = imageEmbedCount > 0;

		logger.debug("imageEmbedCount", imageEmbedCount);

		if (!json) {
			logger.debug("Failed to get tweet data");
			return false;
		}

		const images = json.media?.photos ?? [];
		const videos = json.media?.videos ?? [];

		logger.debug("images", images.length);
		logger.debug("videos", videos.length);

		const imageUrls = getImageUrls(json);

		if (vanilla) {
			if (!json.quote) {
				if (hasImageEmbed && images.length === 1) {
					logger.debug("Rejected: Vanilla twitter with only 1 image");
					return false;
				}
				if (images.length === 0 && videos.length === 0) {
					logger.debug("Rejected: Vanilla twitter with no images, videos and quotes");
					return false;
				}
			}
		}

		if (images.length < 2 && !vanilla) {
			logger.debug("Rejected: Fixup sites with less than 2 images");
			return false;
		}

		// Some fixup sites now render every image correctly on their own. If the
		// source link already produced an image embed per photo, don't override it.
		if (!vanilla && images.length > 0 && imageEmbedCount >= images.length) {
			logger.debug("Rejected: Fixup site already displays all images", imageEmbedCount, images.length);
			return false;
		}

		if (json.possibly_sensitive && "nsfw" in obj.message.channel && !obj.message.channel.nsfw) {
			logger.debug("Rejected: NSFW tweet in SFW channel");
			return false;
		}

		// Workaround for showing videos
		if (
			json.media?.all ?
				json.media?.all[0]?.type === "video"
				: videos.length > 0
		) {
			if (vanilla) {
				// Vanilla twitter can't display videos
				const result = {
					content: json.url.replace("twitter.com", "fxtwitter.com").replace("x.com", "fixupx.com"),
					components: buildComponents(json, 0, 1)
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

		let embedImageUrls = imageUrls;
		let files: BaseMessageOptions["files"];

		const stripDirection = videos.length === 0 ? getStripDirection(images) : null;

		if (stripDirection) {
			try {
				files = [{
					attachment: await stitchStrips(images, stripDirection),
					name: STITCHED_FILENAME
				}];
				embedImageUrls = [`attachment://${STITCHED_FILENAME}`];
				logger.debug("Stitched strips", stripDirection, images.length);
			} catch (e) {
				logger.error("Failed to stitch strips", e);
			}
		}

		const embeds = buildEmbeds(json, embedImageUrls, 0);
		const components = buildComponents(json, 0, getPageCount(embedImageUrls.length));

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
				components,
				files
			}
		};
	},
	onButton: async (interaction) => {
		if (!interaction.customId.startsWith(PAGE_PREFIX)) {
			return false;
		}

		const page = parseInt(interaction.customId.slice(PAGE_PREFIX.length));
		const tweetUrl = interaction.message.embeds[0]?.url;

		if (isNaN(page) || !tweetUrl) {
			return false;
		}

		// Refetch instead of keeping state, so buttons keep working across restarts
		const json = await fetchTweet(new URL(tweetUrl));

		if (!json) {
			return false;
		}

		const imageUrls = getImageUrls(json);
		const pageCount = getPageCount(imageUrls.length);

		if (page < 0 || page >= pageCount) {
			return false;
		}

		return {
			embeds: buildEmbeds(json, imageUrls, page),
			components: buildComponents(json, page, pageCount)
		};
	}
};