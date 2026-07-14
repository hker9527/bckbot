import { describe, it, expect, mock, spyOn, afterEach } from "bun:test";
import { scam } from "@module/scam";
import type { Message } from "discord.js";

const dir = `${import.meta.dir}/__fixtures__/scam`;
const load = (name: string) => Bun.file(`${dir}/${name}.json`).json();

const makeMessage = (content: string): Message =>
	({ content, guild: { preferredLocale: "en-US" } } as unknown as Message);

// action does fetch(...).then(r => r.json())
const stubFetch = (payload: unknown) =>
	spyOn(globalThis, "fetch").mockResolvedValue({ json: async () => payload } as Response);

const run = (msg: Message) => scam.action({ message: msg });

afterEach(() => mock.restore());

describe("scam.action", () => {
	it("does not call Safe Browsing when message has no URL", async () => {
		const fetchSpy = stubFetch(await load("nomatch"));
		expect(await run(makeMessage("hello, no links here"))).toBe(false);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("returns false when Safe Browsing reports no matches", async () => {
		stubFetch(await load("nomatch"));
		expect(await run(makeMessage("check https://example.com"))).toBe(false);
	});

	it("warns with the flagged URL when a threat matches", async () => {
		stubFetch(await load("match"));
		const result = await run(makeMessage("visit http://malware.testing.google.test/testing/malware/"));

		if (result === false) throw new Error("expected reply");
		expect(result.type).toBe("reply");
		expect(result.result.content).toContain("malware.testing.google.test");
	});
});
