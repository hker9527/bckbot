import { describe, it, expect } from "bun:test";
import { fetchTweet } from "@module/twitter";

// Live smoke tests — hit the real fxtwitter API. NOT for CI.
// They guard against upstream API drift (schema change → zod breaks).
// Expect occasional flake (network, deletion); a failure means investigate,
// not block a merge.
//
//   run:  LIVE=1 bun test src/modules/twitter.live.test.ts
//
// Refresh the committed fixtures from here too:
//   curl -s https://api.fxtwitter.com/jack/status/20 > src/modules/__fixtures__/twitter/text-vanilla.json

describe.skipIf(!Bun.env.LIVE)("twitter live", () => {
	it("fetches and validates @jack/status/20 against the live schema", async () => {
		const tweet = await fetchTweet(new URL("https://x.com/jack/status/20"));

		expect(tweet).not.toBeNull();
		expect(tweet?.text).toBe("just setting up my twttr");
	});

	it("validates a live video tweet (SpaceX)", async () => {
		const tweet = await fetchTweet(new URL("https://x.com/SpaceX/status/1732824684683784516"));

		expect(tweet).not.toBeNull();
		expect(tweet?.media?.videos?.length).toBeGreaterThan(0);
	});
});
