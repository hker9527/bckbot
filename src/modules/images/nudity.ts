import { ArgumentRequirement, Module, ModuleActionArgument } from '@app/types/Module';
import * as utils from '@app/utils';
import { fetchInfo } from '@module/images/pixiv';
import { findImageFromMessages } from '@module/images/sauce';
import Twitter = require('twitter');

const deepai = require("deepai");
const T = new Twitter({
	consumer_key: process.env.twitter_key!,
	consumer_secret: process.env.twitter_seckey!,
	access_token_key: process.env.twitter_token!,
	access_token_secret: process.env.twitter_secret!
});

deepai.setApiKey(process.env.deepai);

const pixivRe = /https?:\/\/.*?.pixiv.net.+?networks\/(\d+)/i;
const twitRe = /https?:\/\/twitter.com.*?status\/(\d+)/i;

export const module: Module = {
	trigger: ["nudity"],
	event: "messageCreate",
	argv: {
		"target": [ArgumentRequirement.Optional]
	},
	action: async (obj: ModuleActionArgument) => {
		let url, tmp, isPossibleSensitive;

		if (obj.argv && obj.argv.target) {
			if (tmp = obj.argv.target.match(pixivRe)) {
				const illust = await fetchInfo(tmp[1]);
				if (illust) url = `https://pixiv.cat/${tmp[1]}${illust.pageCount > 1 ? "-1" : ""}.jpg`;
			} else if (tmp = obj.argv.target.match(twitRe)) {
				const d = (await T.get("statuses/lookup", { id: tmp[1], tweet_mode: "extended" })).data[0];
				if (d.extended_entities) {
					url = d.extended_entities.media[0].media_url_https;
					isPossibleSensitive = d.possibly_sensitive;
				}
			}
		}

		if (!url) {
			let index = 0;

			const _index = Math.abs(parseInt(obj.argv!.target));
			if (_index.inRange(0, 100)) {
				index = Math.abs(_index);
			}

			const messages = await obj.message.channel.messages.fetch({ limit: 100 });
			url = findImageFromMessages(index, messages);
		}

		if (!url) {
			return await obj.message.reply("Provided URL is not image or index!");
		}

		const resp = await deepai.callStandardApi("nsfw-detector", {
			image: url
		});

		const score = utils.round(resp.output.nsfw_score * 100);
		return await obj.message.reply(
			(score < 10 ? "🟢" : (score < 50 ? "🟡" : "🔴")) + "\t" +
			score + "% NSFW detected." +
			(isPossibleSensitive ? " (Possibly Sensitive!)" : "") +
			(resp.output.detections.length ?
				("\n```\n" + resp.output.detections.map((a: any) => "(" + utils.round(a.confidence) * 100 + "%)\t" + a.name + " at (" + a.bounding_box[0] + ", " + a.bounding_box[1] + ") " + a.bounding_box[2] + "x" + a.bounding_box[3]).join("\n")) + "\n```" :
				"")
		);
	}
};