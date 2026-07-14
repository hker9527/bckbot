import { describe, it, expect, mock, spyOn, afterEach } from "bun:test";
import { fetchList, genEmbed, moebooru, type ImageObject } from "@module/moebooru";

const dir = `${import.meta.dir}/__fixtures__/moebooru`;
const load = (name: string) => Bun.file(`${dir}/${name}.json`).json();

// fetchList does fetch(url).then(r => r.json())
const stubFetch = (payload: unknown) =>
	spyOn(globalThis, "fetch").mockResolvedValue({
		json: async () => payload
	} as Response);

const image = (over: Partial<ImageObject> = {}): ImageObject => ({
	id: "1",
	rating: "s",
	source: "https://example.com/src",
	file_url: "https://example.com/img.png",
	created_at: new Date("2024-01-01T00:00:00.000Z"),
	width: 800,
	height: 600,
	...over
});

afterEach(() => mock.restore());

describe("moebooru.genEmbed (pure)", () => {
	it("colors embed by rating", () => {
		expect(genEmbed("dan", image({ rating: "s" })).color).toBe(0x7df28b);
		expect(genEmbed("dan", image({ rating: "q" })).color).toBe(0xe4ea69);
		expect(genEmbed("dan", image({ rating: "e" })).color).toBe(0xd37a52);
	});

	// NOTE: gate is `showImage && (rating !== "s" || nsfw)`. These lock in the CURRENT
	// (suspicious) behavior — explicit shows in SFW, safe hidden unless nsfw. The gate
	// looks inverted vs. safety intent; dormant because moebooru.action is a noop.
	// If genEmbed gets wired up, revisit moebooru.ts:126 and flip these expectations.
	it("[current] hides safe image in SFW context", () => {
		expect(genEmbed("dan", image({ rating: "s" }), true, false).image).toBeUndefined();
	});

	it("[current] shows safe image when nsfw allowed", () => {
		expect(genEmbed("dan", image({ rating: "s" }), true, true).image?.url)
			.toBe("https://example.com/img.png");
	});

	it("[current] shows explicit image even in SFW context (suspect: see note)", () => {
		expect(genEmbed("dan", image({ rating: "e" }), true, false).image?.url)
			.toBe("https://example.com/img.png");
	});

	it("never shows image when showImage is false", () => {
		expect(genEmbed("dan", image({ rating: "e" }), false, true).image).toBeUndefined();
	});

	it("builds post link and dimensions fields", () => {
		const embed = genEmbed("dan", image({ id: "42", width: 1920, height: 1080 }));
		const fields = embed.fields!;
		expect(fields[0].value).toContain("danbooru.donmai.us/posts/42");
		expect(fields[1].value).toBe("1920 x 1080");
	});
});

describe("moebooru.fetchList (mapping)", () => {
	it("maps danbooru posts (real fixture, ISO date)", async () => {
		stubFetch(await load("dan"));
		const list = await fetchList("dan");
		expect(list.length).toBeGreaterThan(0);
		expect(typeof list[0].id).toBe("string");
		expect(list[0].created_at).toBeInstanceOf(Date);
		expect(list[0].file_url).toBeTruthy();
	});

	it("maps yandere posts (real fixture, unix date)", async () => {
		stubFetch(await load("yan"));
		const list = await fetchList("yan");
		expect(list.length).toBeGreaterThan(0);
		expect(list[0].created_at.getTime()).toBeGreaterThan(0);
	});

	it("maps konachan posts", async () => {
		stubFetch(await load("kon"));
		const list = await fetchList("kon");
		expect(list[0].id).toBe("300001");
		expect(list[0].width).toBe(1920);
	});

	it("maps sankaku posts (nested data, file_url fallback)", async () => {
		stubFetch(await load("san"));
		const list = await fetchList("san");
		// file_url null → falls back to sample_url
		expect(list[0].file_url).toBe("https://sankaku.example/sample.jpg");
		expect(list[0].id).toBe("400001");
	});
});

describe("moebooru.action", () => {
	it("is a noop (returns false) until embed generation is implemented", async () => {
		expect(await moebooru.action({ message: {} as any })).toBe(false);
	});
});
