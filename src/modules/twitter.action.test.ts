import { describe, it, expect, mock, spyOn, beforeEach, afterEach } from "bun:test";
import { getStripDirection, twitter } from "@module/twitter";
import sharp from "sharp";
import type { APIEmbed, BaseMessageOptions, ButtonInteraction, Message } from "discord.js";
import { loadEmbed, loadFixture, setPhotos, setSensitive } from "./__fixtures__/twitter/load";

// ---- mock Discord Message ----

interface MockOpts {
	embeds?: Array<{ image?: { width: number; height: number; url?: string } }>;
	nsfw?: boolean;
}

// Real captured embed X renders in place of the media on a sensitive tweet.
let placeholderEmbed: Record<string, any>;

const makeMessage = (content: string, { embeds = [], nsfw = true }: MockOpts = {}): Message => {
	const msg = {
		id: "msg-1",
		content,
		embeds,
		suppressEmbeds: mock(async () => {}),
		channel: {
			nsfw,
			// action refetches to reload embeds; return the same mock
			messages: { fetch: mock(async () => msg) }
		}
	};
	return msg as unknown as Message;
};

// ---- fetch stub: fetchTweet does (await fetch(url)).text() ----

const stubFetch = (payload: unknown) =>
	spyOn(globalThis, "fetch").mockResolvedValue({
		text: async () => JSON.stringify(payload)
	} as Response);

const run = (msg: Message) => twitter.action({ message: msg });

const buttonsOf = (options: BaseMessageOptions) => (options.components?.[0] as any).components;

// Real captured envelope, mutated per-case via helpers.
let base: Awaited<ReturnType<typeof loadFixture>>;

beforeEach(async () => {
	base = await loadFixture("photo-vanilla");
	placeholderEmbed = await loadEmbed("embed-sensitive-placeholder");
	// action awaits Bun.sleep(2000) before refetching embeds — skip the wait
	spyOn(Bun, "sleep").mockResolvedValue(undefined as never);
});

afterEach(() => {
	mock.restore();
});

describe("twitter.action", () => {
	it("returns false when message has no twitter link", async () => {
		stubFetch(setPhotos(base, 2));

		const result = await run(makeMessage("just some text, no links"));

		expect(result).toBe(false);
	});

	it("rejects fixup site with fewer than 2 images", async () => {
		stubFetch(setPhotos(base, 1));

		const result = await run(makeMessage("look https://fxtwitter.com/jane/status/123"));

		expect(result).toBe(false);
	});

	it("rejects NSFW tweet in a SFW channel", async () => {
		stubFetch(setSensitive(setPhotos(base, 2)));

		const result = await run(
			makeMessage("https://fxtwitter.com/jane/status/123", { nsfw: false })
		);

		expect(result).toBe(false);
	});

	it("accepts fixup site with >=2 images when source shows none", async () => {
		stubFetch(setPhotos(base, 2));

		// original message has no image embeds → bot builds the multi-image reply
		const msg = makeMessage("https://fxtwitter.com/jane/status/123");
		const result = await run(msg);

		if (result === false) throw new Error("expected reply");
		expect(result.type).toBe("reply");
		expect(result.result.embeds).toHaveLength(2);
		expect(msg.suppressEmbeds).toHaveBeenCalled();
	});

	it("does NOT override a fixup site that already renders every image", async () => {
		stubFetch(setPhotos(base, 2));

		// source link already produced 2 image embeds == API photo count → skip
		const embeds = [
			{ image: { width: 800, height: 600 } },
			{ image: { width: 800, height: 600 } }
		];
		const result = await run(makeMessage("https://fxtwitter.com/jane/status/123", { embeds }));

		expect(result).toBe(false);
	});

	it("still overrides when the fixup site renders only some images", async () => {
		stubFetch(setPhotos(base, 3));

		// 3 photos but source rendered only 1 → bot builds the full reply
		const embeds = [{ image: { width: 800, height: 600 } }];
		const result = await run(makeMessage("https://fxtwitter.com/jane/status/123", { embeds }));

		if (result === false) throw new Error("expected reply");
		expect(result.result.embeds).toHaveLength(3);
	});

	// The bug, on the real fixture it was reported from: a sensitive single-photo
	// tweet linked with a vanilla url. X unfurls the placeholder, the placeholder
	// counted as a rendered photo, the single-photo gate skipped the tweet, and
	// the user was left with grey.
	it("overrides the real sensitive single-photo tweet behind a placeholder embed", async () => {
		stubFetch(await loadFixture("photo-sensitive"));

		const result = await run(
			makeMessage("https://x.com/mnk_disukyamada/status/2091470306557018144?s=12", {
				embeds: [placeholderEmbed]
			})
		);

		if (result === false) throw new Error("expected reply");
		expect(result.result.embeds).toHaveLength(1);
		expect(result.result.embeds![0].image?.url).toBe(
			"https://pbs.twimg.com/media/HQZlKHnasAETrUV.jpg?name=orig"
		);
	});

	// Guard the other direction: the single-photo gate must still fire when the
	// source link really did render the photo.
	it("still skips a vanilla single-photo tweet whose photo actually rendered", async () => {
		stubFetch(await loadFixture("photo-sensitive"));

		const embeds = [{ image: { width: 1429, height: 2048, url: "https://pbs.twimg.com/media/HQZlKHnasAETrUV.jpg" } }];
		const result = await run(
			makeMessage("https://x.com/mnk_disukyamada/status/2091470306557018144", { embeds })
		);

		expect(result).toBe(false);
	});

	it("overrides vanilla single-photo tweet when source only shows the sensitive placeholder", async () => {
		stubFetch(setSensitive(setPhotos(base, 1)));

		// Placeholder embed must not count as the photo being rendered
		const result = await run(
			makeMessage("https://x.com/jane/status/123", { embeds: [placeholderEmbed] })
		);

		if (result === false) throw new Error("expected reply");
		expect(result.result.embeds).toHaveLength(1);
	});

	it("overrides fixup site whose image embeds are all sensitive placeholders", async () => {
		stubFetch(setSensitive(setPhotos(base, 2)));

		const embeds = [placeholderEmbed, placeholderEmbed];
		const result = await run(makeMessage("https://fxtwitter.com/jane/status/123", { embeds }));

		if (result === false) throw new Error("expected reply");
		expect(result.result.embeds).toHaveLength(2);
	});

	it("rejects the real sensitive tweet in a SFW channel", async () => {
		stubFetch(await loadFixture("video-sensitive"));

		const result = await run(
			makeMessage("https://x.com/CosplayerBunbun/status/2091473283229376570", {
				embeds: [placeholderEmbed],
				nsfw: false
			})
		);

		expect(result).toBe(false);
	});

	it("rewrites the real sensitive video tweet in a NSFW channel", async () => {
		stubFetch(await loadFixture("video-sensitive"));

		// This is the message the placeholder embed was captured from. It takes the
		// video path, so the placeholder never reaches an image gate — the url
		// filter matters for sensitive *photo* tweets.
		const result = await run(
			makeMessage("https://x.com/CosplayerBunbun/status/2091473283229376570", {
				embeds: [placeholderEmbed]
			})
		);

		if (result === false) throw new Error("expected reply");
		expect(result.result.content).toBe("https://fixupx.com/CosplayerBunbun/status/2091473283229376570");
	});

	it("merges 10 images into one card without paging", async () => {
		stubFetch(setPhotos(base, 10));

		const result = await run(makeMessage("https://fxtwitter.com/jane/status/123"));

		if (result === false || result === true) throw new Error("expected reply");
		const embeds = result.result.embeds as APIEmbed[];
		const tweetUrl = base.tweet.url;

		expect(embeds).toHaveLength(10);
		expect(embeds.map(embed => embed.image?.url)).toEqual(
			Array.from({ length: 10 }, (_, i) => `https://pbs.twimg.com/media/p${i}.jpg`)
		);
		expect(embeds.map(embed => embed.url)).toEqual(Array(10).fill(tweetUrl));
		expect(buttonsOf(result.result)).toHaveLength(1);
	});

	it("pages tweets with more than 10 images", async () => {
		stubFetch(setPhotos(base, 20));

		const result = await run(makeMessage("https://fxtwitter.com/jane/status/123"));

		if (result === false || result === true) throw new Error("expected reply");
		const embeds = result.result.embeds as APIEmbed[];
		const [, prev, indicator, next] = buttonsOf(result.result);

		expect(embeds).toHaveLength(10);
		expect(embeds[0].description).toBeDefined();
		expect(embeds[9].image?.url).toBe("https://pbs.twimg.com/media/p9.jpg");
		expect(prev).toMatchObject({ customId: "twitter:page:-1", disabled: true });
		expect(indicator).toMatchObject({ label: "1 / 2", disabled: true });
		expect(next).toMatchObject({ customId: "twitter:page:1", disabled: false });
	});

	it("rewrites vanilla video tweet to fixupx link (real SpaceX fixture)", async () => {
		// Real vanilla video-only tweet: no photos, no quote, url on x.com.
		// Regression guard for the twitter.ts:106 gate bug — before the fix this
		// tweet was rejected (images.length === 0) and the video rewrite never ran.
		stubFetch(await loadFixture("video-vanilla"));

		const result = await run(makeMessage("https://x.com/SpaceX/status/1732824684683784516"));

		if (result === false) throw new Error("expected reply");
		expect(result.result.content).toBe("https://fixupx.com/SpaceX/status/1732824684683784516");
	});
});

describe("strip stitching", () => {
	it("detects the real tweet that splits one photo into 20 strips", async () => {
		const split = await loadFixture("photos20-split");
		const normal = await loadFixture("photos20-vanilla");

		expect(getStripDirection(split.tweet.media.photos)).toBe("horizontal");
		expect(getStripDirection(normal.tweet.media.photos)).toBeNull();
	});

	it("ignores same-sized photos that are not strips", () => {
		const photos = Array.from({ length: 4 }, (_, i) => ({ url: `p${i}`, width: 2048, height: 2048 }));

		expect(getStripDirection(photos)).toBeNull();
	});

	it("detects strips meant to be stacked", () => {
		const photos = Array.from({ length: 3 }, (_, i) => ({ url: `p${i}`, width: 1200, height: 300 }));

		expect(getStripDirection(photos)).toBe("vertical");
	});

	it("replies with one stitched image for the real split tweet", async () => {
		const split = await loadFixture("photos20-split");
		const tile = await sharp({
			create: { width: 75, height: 1000, channels: 3, background: "#3366cc" }
		}).jpeg().toBuffer();

		spyOn(globalThis, "fetch").mockImplementation((async (input: string | URL | Request) =>
			String(input).startsWith("https://api.fxtwitter.com/")
				? new Response(JSON.stringify(split))
				: new Response(tile)
		) as typeof fetch);

		const result = await run(makeMessage(split.tweet.url));

		if (result === false || result === true) throw new Error("expected reply");
		const embeds = result.result.embeds as APIEmbed[];
		const [file] = result.result.files as { attachment: Buffer, name: string }[];
		const { data, info } = await sharp(file.attachment).raw().toBuffer({ resolveWithObject: true });
		const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3];

		expect(embeds).toHaveLength(1);
		expect(embeds[0].image?.url).toBe(`attachment://${file.name}`);
		expect(buttonsOf(result.result)).toHaveLength(1);
		// 20 strips of 75 plus 19 gaps of 9
		expect([info.width, info.height, info.channels]).toEqual([1671, 1000, 4]);
		// Rounded corner, strip middle, and the gap after the first strip
		expect(alphaAt(0, 0)).toBe(0);
		expect(alphaAt(37, 500)).toBe(255);
		expect(alphaAt(79, 500)).toBe(0);
	});

	it("falls back to the photos when a strip fails to download", async () => {
		const split = await loadFixture("photos20-split");

		spyOn(globalThis, "fetch").mockImplementation((async (input: string | URL | Request) =>
			String(input).startsWith("https://api.fxtwitter.com/")
				? new Response(JSON.stringify(split))
				: new Response(null, { status: 404 })
		) as typeof fetch);

		const result = await run(makeMessage(split.tweet.url));

		if (result === false || result === true) throw new Error("expected reply");
		expect(result.result.files).toBeUndefined();
		expect(result.result.embeds).toHaveLength(10);
		expect(buttonsOf(result.result)).toHaveLength(4);
	});
});

describe("twitter.onButton", () => {
	const makeInteraction = (customId: string) => ({
		customId,
		message: { embeds: [{ url: base.tweet.url }] }
	}) as unknown as ButtonInteraction;

	it("builds the requested page with its own controls", async () => {
		stubFetch(setPhotos(base, 20));

		const result = await twitter.onButton!(makeInteraction("twitter:page:1"));

		if (result === false) throw new Error("expected edit");
		const embeds = result.embeds as APIEmbed[];
		const [link, prev, indicator, next] = buttonsOf(result);

		expect(embeds).toHaveLength(10);
		expect(embeds[0].description).toBeDefined();
		expect(embeds.map(embed => embed.image?.url)).toEqual(
			Array.from({ length: 10 }, (_, i) => `https://pbs.twimg.com/media/p${i + 10}.jpg`)
		);
		expect(link).toMatchObject({ url: base.tweet.url });
		expect(prev).toMatchObject({ customId: "twitter:page:0", disabled: false });
		expect(indicator).toMatchObject({ label: "2 / 2" });
		expect(next).toMatchObject({ customId: "twitter:page:2", disabled: true });
		expect(result.components).toHaveLength(1);
	});

	it("ignores pages out of range", async () => {
		stubFetch(setPhotos(base, 20));

		expect(await twitter.onButton!(makeInteraction("twitter:page:2"))).toBe(false);
	});
});
