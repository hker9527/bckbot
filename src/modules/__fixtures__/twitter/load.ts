// Fixture loader for twitter tests.
//
// text-vanilla.json   — real fxtwitter response, @jack/status/20 (first tweet, text only)
// photo-vanilla.json  — real fxtwitter response, Obama "Four more years" (single photo)
// video-vanilla.json  — real fxtwitter response, SpaceX launch (video only)
// video-sensitive.json — real fxtwitter response, possibly_sensitive video tweet.
//                       NSFW media urls; used for schema shape and the NSFW gate only.
//
// Raw fixtures are captured live ONCE and committed, so tests exercise real API
// shape without depending on those tweets staying up. Variant helpers below clone
// a real envelope and swap only the media/quote fields — envelope stays authentic.

const dir = import.meta.dir;

export type Envelope = {
	code: number;
	message: string;
	tweet: Record<string, any>;
};

export const loadFixture = async (name: string): Promise<Envelope> =>
	Bun.file(`${dir}/${name}.json`).json();

// embed-sensitive-placeholder.json — real Discord embed captured from a message
// linking a sensitive tweet. X serves a generic open graph image instead of the
// media, and it has real dimensions, so it counts as a rendered photo unless
// filtered by url.
export const loadEmbed = async (name: string): Promise<Record<string, any>> =>
	Bun.file(`${dir}/${name}.json`).json();

const clone = (fx: Envelope): Envelope => structuredClone(fx);

/** Set N photos (real envelope, synthetic urls). */
export const setPhotos = (fx: Envelope, n: number): Envelope => {
	const c = clone(fx);
	c.tweet.media = {
		photos: Array.from({ length: n }, (_, i) => ({ url: `https://pbs.twimg.com/media/p${i}.jpg` }))
	};
	return c;
};

/** Turn into a video tweet. */
export const setVideo = (fx: Envelope): Envelope => {
	const c = clone(fx);
	c.tweet.media = {
		all: [{ type: "video", url: "https://video.twimg.com/v.mp4" }],
		videos: [{ thumbnail_url: "https://pbs.twimg.com/thumb.jpg" }]
	};
	return c;
};

/** Attach a quote (copy of the same tweet, one level deep). */
export const setQuote = (fx: Envelope): Envelope => {
	const c = clone(fx);
	const q = structuredClone(fx.tweet);
	delete q.quote;
	c.tweet.quote = q;
	return c;
};

export const setSensitive = (fx: Envelope): Envelope => {
	const c = clone(fx);
	c.tweet.possibly_sensitive = true;
	return c;
};
