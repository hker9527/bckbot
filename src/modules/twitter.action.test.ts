import { describe, it, expect, mock, spyOn, beforeEach, afterEach } from "bun:test";
import { twitter } from "@module/twitter";
import type { Message } from "discord.js";
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
