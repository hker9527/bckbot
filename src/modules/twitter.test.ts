import { describe, it, expect, mock, spyOn, afterEach } from "bun:test";
import { fetchTweet, isSensitivePlaceholder } from "@module/twitter";
import { loadEmbed, loadFixture } from "./__fixtures__/twitter/load";

// Stub global fetch to return a Response-like with .text().
const stubFetch = (body: unknown) =>
	spyOn(globalThis, "fetch").mockResolvedValue({
		text: async () => (typeof body === "string" ? body : JSON.stringify(body))
	} as Response);

afterEach(() => {
	mock.restore();
});

describe("isSensitivePlaceholder", () => {
	it("matches the real captured placeholder embed", async () => {
		const embed = await loadEmbed("embed-sensitive-placeholder");

		// The placeholder carries real dimensions, so the width/height filter alone
		// counts it as a rendered photo — that is why the url check exists.
		expect(embed.image.width).toBeGreaterThan(0);
		expect(embed.image.height).toBeGreaterThan(0);
		expect(isSensitivePlaceholder(embed.image.url)).toBe(true);
	});

	it("tolerates a query string", () => {
		expect(isSensitivePlaceholder("https://abs.twimg.com/rweb/ssr/default/v2/og/image.png?format=png")).toBe(true);
	});

	it("does not match real media or a missing url", () => {
		expect(isSensitivePlaceholder("https://pbs.twimg.com/media/p0.jpg")).toBe(false);
		expect(isSensitivePlaceholder(undefined)).toBe(false);
	});
});

describe("fetchTweet", () => {
	// Battle test: real captured fxtwitter payload must pass the live zod schema.
	it("parses a real FXTwitter response (text tweet)", async () => {
		stubFetch(await loadFixture("text-vanilla"));

		const tweet = await fetchTweet(new URL("https://x.com/jack/status/20"));

		expect(tweet).not.toBeNull();
		expect(tweet?.text).toBe("just setting up my twttr");
		expect(tweet?.author.screen_name).toBe("jack");
	});

	it("parses a real FXTwitter response (sensitive video tweet)", async () => {
		stubFetch(await loadFixture("video-sensitive"));

		const tweet = await fetchTweet(new URL("https://x.com/CosplayerBunbun/status/2091473283229376570"));

		expect(tweet).not.toBeNull();
		expect(tweet?.possibly_sensitive).toBe(true);
		// Sensitive tweets are not redacted by the API — only the Discord embed is
		expect(tweet?.author.screen_name).toBe("CosplayerBunbun");
		expect(tweet?.media?.videos?.length).toBe(1);
	});

	it("parses a real FXTwitter response (photo tweet)", async () => {
		stubFetch(await loadFixture("photo-vanilla"));

		const tweet = await fetchTweet(new URL("https://x.com/BarackObama/status/266031293945503744"));

		expect(tweet?.media?.photos?.length).toBeGreaterThan(0);
	});

	it("builds fxtwitter API URL from author + statusId in path", async () => {
		const fetchSpy = stubFetch(await loadFixture("text-vanilla"));

		await fetchTweet(new URL("https://twitter.com/someuser/status/987654321"));

		expect(fetchSpy).toHaveBeenCalledWith(
			"https://api.fxtwitter.com/someuser/status/987654321"
		);
	});

	it("returns null on malformed JSON", async () => {
		stubFetch("not json {{{");

		const tweet = await fetchTweet(new URL("https://x.com/a/status/1"));

		expect(tweet).toBeNull();
	});

	it("returns null when payload fails schema check", async () => {
		stubFetch({ code: 200, message: "OK", tweet: { text: "missing fields" } });

		const tweet = await fetchTweet(new URL("https://x.com/a/status/1"));

		expect(tweet).toBeNull();
	});

	it("returns null when fetch throws", async () => {
		spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

		const tweet = await fetchTweet(new URL("https://x.com/a/status/1"));

		expect(tweet).toBeNull();
	});
});
