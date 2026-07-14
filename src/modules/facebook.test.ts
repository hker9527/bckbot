import { describe, it, expect, mock, spyOn, beforeEach, afterEach } from "bun:test";
import { facebook } from "@module/facebook";
import type { Message } from "discord.js";

const dir = `${import.meta.dir}/__fixtures__/facebook`;
const loadHtml = (name: string) => Bun.file(`${dir}/${name}.html`).text();

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

// action fetches facebed HTML via fetch(url).then(r => r.text())
const stubFetch = (html: string) =>
	spyOn(globalThis, "fetch").mockResolvedValue({ text: async () => html } as Response);

const run = (msg: Message) => facebook.action({ message: msg });

beforeEach(() => {
	spyOn(Bun, "sleep").mockResolvedValue(undefined as never);
});
afterEach(() => mock.restore());

describe("facebook.action", () => {
	it("returns false for non-facebook link", async () => {
		stubFetch(await loadHtml("valid"));
		expect(await run(makeMessage("https://example.com/foo"))).toBe(false);
	});

	it("rejects unsupported facebook path", async () => {
		stubFetch(await loadHtml("valid"));
		// /me is not in the supported path list
		expect(await run(makeMessage("https://www.facebook.com/me"))).toBe(false);
	});

	it("rejects when facebed returns a login wall", async () => {
		stubFetch(await loadHtml("login"));
		expect(await run(makeMessage("https://www.facebook.com/reel/123"))).toBe(false);
	});

	it("accepts supported path with valid facebed content", async () => {
		stubFetch(await loadHtml("valid"));
		const msg = makeMessage("https://www.facebook.com/reel/123");
		const result = await run(msg);

		if (result === false) throw new Error("expected reply");
		expect(result.type).toBe("reply");
		expect(result.result.content).toBe("https://facebed.com/reel/123");
		expect(msg.suppressEmbeds).toHaveBeenCalled();
	});

	it("accepts /groups/... post path", async () => {
		stubFetch(await loadHtml("valid"));
		const result = await run(makeMessage("https://www.facebook.com/groups/1/posts/2"));
		expect(result).not.toBe(false);
	});
});
