import { describe, it, expect, mock, spyOn, afterEach } from "bun:test";
import { pixiv, Illust } from "@module/pixiv";
import type { PixivIllustItem } from "@book000/pixivts";

const dir = `${import.meta.dir}/__fixtures__/pixiv`;
const loadItem = () => Bun.file(`${dir}/illust-single.json`).json();

// toMessage does HEAD fetches to warm the CDN — stub them.
const stubFetch = () => spyOn(globalThis, "fetch").mockResolvedValue({} as Response);

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
		// i.pximg.net proxied to i.yuki.sh
		expect(embed.image.url).toBe(
			"https://i.yuki.sh/img-original/img/2024/01/01/00/00/00/123456_p0.png"
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
