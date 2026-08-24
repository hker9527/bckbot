import { describe, it, expect, mock, spyOn, afterEach } from "bun:test";
import { pixiv, Illust } from "@module/pixiv";
import type { PixivIllustItem } from "@book000/pixivts";

const dir = `${import.meta.dir}/__fixtures__/pixiv`;
const loadItem = () => Bun.file(`${dir}/illust-single.json`).json();

// Pin the proxy list so a developer's local .env can't change what we assert.
Bun.env.pixiv_proxy_hosts = "i.pixiv.cat";

// toMessage HEAD-probes the proxy to pick a host and warm the CDN — stub it.
// The probe treats a non-ok response as a dead host, so ok must be true.
const stubFetch = () => spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);

afterEach(() => mock.restore());

describe("pixiv routing pattern", () => {
	const match = (s: string) => s.match(pixiv.pattern!);

	it("extracts illust id from /artworks/ URL", () => {
		expect(match("https://www.pixiv.net/artworks/123456")?.[2]).toBe("123456");
	});

	it("extracts illust id from legacy illust_id= query", () => {
		expect(match("member_illust.php?illust_id=987654")?.[2]).toBe("987654");
	});

	it("does not match unrelated text", () => {
		expect(match("just a normal message")).toBeNull();
	});
});

describe("pixiv Illust.toMessage (embed building)", () => {
	it("builds a single-page SFW embed with a proxied image", async () => {
		stubFetch();
		const item = (await loadItem()) as PixivIllustItem;

		const msg = await new Illust(item).toMessage(false);

		if (!msg?.embeds) throw new Error("expected embeds");
		expect(msg.embeds).toHaveLength(1);
		const embed = msg.embeds[0] as any;
		// i.pximg.net proxied to the first reachable host
		expect(embed.image.url).toBe(
			"https://i.pixiv.cat/img-original/img/2024/01/01/00/00/00/123456_p0.png"
		);
		expect(embed.color).toBe(0x3D92F5);
		expect(embed.footer.text).toContain("100"); // total_bookmarks
	});

	it("emits one embed per page for multi-page works", async () => {
		stubFetch();
		const item = (await loadItem()) as any;
		item.page_count = 3;
		item.meta_pages = [0, 1, 2].map(i => ({
			image_urls: { original: `https://i.pximg.net/p${i}.png` }
		}));

		const msg = await new Illust(item as PixivIllustItem).toMessage(false);
		expect(msg?.embeds).toHaveLength(3);
	});

	it("censors NSFW work in a SFW context (thumbnail, no image)", async () => {
		stubFetch();
		const item = (await loadItem()) as any;
		item.x_restrict = 1;

		const msg = await new Illust(item as PixivIllustItem).toMessage(false);

		if (!msg?.embeds) throw new Error("expected embeds");
		const embed = msg.embeds[0] as any;
		expect(msg.embeds).toHaveLength(1);
		expect(embed.image).toBeUndefined();
		expect(embed.thumbnail).toBeDefined();
		expect(embed.color).toBe(0xd37a52);
	});

	it("shows NSFW image when nsfw is allowed", async () => {
		stubFetch();
		const item = (await loadItem()) as any;
		item.x_restrict = 1;

		const msg = await new Illust(item as PixivIllustItem).toMessage(true);
		expect((msg?.embeds?.[0] as any).image).toBeDefined();
	});
});

describe("pixiv proxy failover", () => {
	// Each test uses fresh host names — the cooldown map is module-scoped and
	// would otherwise leak a disabled host into the next test.
	const stubHosts = (deadHost: string) =>
		spyOn(globalThis, "fetch").mockImplementation(async (input: any) =>
			(input as string).includes(deadHost) ?
				Promise.reject(new Error("ECONNREFUSED")) :
				({ ok: true } as Response)
		);

	afterEach(() => { Bun.env.pixiv_proxy_hosts = "i.pixiv.cat"; });

	it("falls through to the next host when the first is unreachable", async () => {
		Bun.env.pixiv_proxy_hosts = "dead-1.test,alive-1.test";
		stubHosts("dead-1.test");

		const msg = await new Illust((await loadItem()) as PixivIllustItem).toMessage(false);

		expect((msg?.embeds?.[0] as any).image.url).toBe(
			"https://alive-1.test/img-original/img/2024/01/01/00/00/00/123456_p0.png"
		);
	});

	it("skips a host that answers with a non-OK status", async () => {
		Bun.env.pixiv_proxy_hosts = "dead-2.test,alive-2.test";
		spyOn(globalThis, "fetch").mockImplementation(async (input: any) =>
			({ ok: !(input as string).includes("dead-2.test") } as Response)
		);

		const msg = await new Illust((await loadItem()) as PixivIllustItem).toMessage(false);

		expect((msg?.embeds?.[0] as any).image.url).toContain("https://alive-2.test/");
	});

	it("returns null when every host is down", async () => {
		Bun.env.pixiv_proxy_hosts = "dead-3.test,dead-4.test";
		spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

		expect(await new Illust((await loadItem()) as PixivIllustItem).toMessage(false)).toBeNull();
	});
});
