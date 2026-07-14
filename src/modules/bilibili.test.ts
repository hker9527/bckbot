import { describe, it, expect, mock, spyOn, afterEach } from "bun:test";
import { bilibili } from "@module/bilibili";
import type { Message } from "discord.js";

const makeMessage = (content: string): Message => {
	const msg = {
		id: "msg-1",
		content,
		embeds: [],
		suppressEmbeds: mock(async () => {}),
		channel: { messages: { fetch: mock(async () => msg) } }
	};
	return msg as unknown as Message;
};

const run = (msg: Message) => bilibili.action({ message: msg });

// action probes the rewritten URL: checks fetch(url).ok, then reads the body to
// pull the canonical og:url. Default body has no og:url -> raw-rewrite fallback.
const stubFetch = (ok: boolean, html = "") =>
	spyOn(globalThis, "fetch").mockResolvedValue({ ok, text: async () => html } as Response);

afterEach(() => mock.restore());

describe("bilibili.action", () => {
	it("returns false for non-bilibili link", async () => {
		expect(await run(makeMessage("https://example.com/foo"))).toBe(false);
	});

	it("rejects unsupported bilibili path", async () => {
		// /account is not an embeddable content path
		expect(await run(makeMessage("https://www.bilibili.com/account"))).toBe(false);
	});

	it("rejects when vxbilibili reports the link does not exist", async () => {
		stubFetch(false);
		expect(await run(makeMessage("https://www.bilibili.com/video/BV0000000000"))).toBe(false);
	});

	it("rejects when the existence probe throws", async () => {
		spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
		expect(await run(makeMessage("https://www.bilibili.com/video/BV1xx411c7mD"))).toBe(false);
	});

	it("rewrites a video link to vxbilibili and keeps the path", async () => {
		stubFetch(true);
		const msg = makeMessage("https://www.bilibili.com/video/BV1xx411c7mD");
		const result = await run(msg);

		if (result === false) throw new Error("expected reply");
		expect(result.type).toBe("reply");
		expect(result.result.content).toBe("https://www.vxbilibili.com/video/BV1xx411c7mD");
		expect(msg.suppressEmbeds).toHaveBeenCalled();
	});

	it("preserves query params (multi-page videos)", async () => {
		stubFetch(true);
		const result = await run(makeMessage("https://www.bilibili.com/video/BV1xx?p=2"));
		if (result === false) throw new Error("expected reply");
		expect(result.result.content).toBe("https://www.vxbilibili.com/video/BV1xx?p=2");
	});

	it("rewrites b23.tv short links (any path)", async () => {
		stubFetch(true);
		const result = await run(makeMessage("https://b23.tv/abcd123"));
		if (result === false) throw new Error("expected reply");
		expect(result.result.content).toBe("https://vxb23.tv/abcd123");
	});

	it("rewrites subdomain content (live streams)", async () => {
		stubFetch(true);
		const result = await run(makeMessage("https://live.bilibili.com/12345"));
		if (result === false) throw new Error("expected reply");
		expect(result.result.content).toBe("https://live.vxbilibili.com/12345");
	});

	it("rewrites opus posts", async () => {
		stubFetch(true);
		const result = await run(makeMessage("https://www.bilibili.com/opus/987654321"));
		if (result === false) throw new Error("expected reply");
		expect(result.result.content).toBe("https://www.vxbilibili.com/opus/987654321");
	});

	it("uses vxbilibili's canonical og:url to strip tracking params", async () => {
		// b23.tv short link carrying tracking; vxbilibili resolves it to a clean
		// canonical video URL in og:url.
		stubFetch(
			true,
			'<meta content="https://www.bilibili.com/video/BV12nMn6ZEd6?p=1"property=og:url>'
		);
		const result = await run(
			makeMessage("https://b23.tv/R9v1RBj?share_source=copy_web&buvid=XY")
		);
		if (result === false) throw new Error("expected reply");

		// posted proxy link is the clean canonical, rewritten to vxbilibili
		expect(result.result.content).toBe("https://www.vxbilibili.com/video/BV12nMn6ZEd6?p=1");
		// button points at the untracked original
		const button = (result.result.components?.[0] as any).components[0];
		expect(button.url).toBe("https://www.bilibili.com/video/BV12nMn6ZEd6?p=1");
	});
});
