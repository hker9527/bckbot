const base = require("./_base.js");
const CredInfo = require("../cred.js");
const pixiv = require("./pixiv.js");
const deepai = require("deepai");
deepai.setApiKey(CredInfo.deepai);
const T = require("twit")({
    consumer_key: CredInfo.twitter_key,
    consumer_secret: CredInfo.twitter_seckey,
    access_token: CredInfo.twitter_token,
    access_token_secret: CredInfo.twitter_secret
});
const imageRe = /(https?:\/\/[^\s]+?\.(png|jpg|jpeg))/ig;
const pixivRe = /https?:\/\/.*?.pixiv.net.+?illust_id=(\d+)/i;
const twitRe = /https?:\/\/twitter.com.*?status\/(\d+)/i;
const findImageFromMessages = require("./sauce.js").findImageFromMessages;

module.exports = {
    trigger: ["nudity"],
    event: "message",
    action: async function (trigger, message, LocalStorage) {
        let txt = base.extArgv(message, true);
        let argv = base.parseArgv(txt);

        let url, tmp, isPossibleSensitive;

        if (base.isValid(argv[0]) && (tmp = argv[0].match(pixivRe))) {
            let illust = await pixiv.fetchInfo(tmp[1]);
            url = "https://pixiv.cat/" + illust.id + (illust.page_count > 1 ? "-1" : "") + ".jpg";
        } else if (base.isValid(argv[0]) && (tmp = argv[0].match(twitRe))) {
            let d = (await T.get("statuses/lookup", {id: tmp[1], tweet_mode: "extended"})).data[0];
            if (d.extended_entities) {
                url = d.extended_entities.media[0].media_url_https;
                isPossibleSensitive = d.possibly_sensitive;
            }
        } else { // index provided?
            let index = 0;

            if (!isNaN(argv[0])) {
                _index = parseInt(argv[0]);
                if (Math.abs(_index) <= 100) index = Math.abs(_index);
            }

            let msgs = (await message.channel.messages.fetch({limit: 100})).array();
            url = findImageFromMessages(index, msgs, message);
        }

        if (!url) {
            return message.reply("Provided URL is not image or index!");
            throw new Error("InvalidInput");
        }
        let msg = await message.channel.send("Querying image `" + url + "`...");

        var resp = await deepai.callStandardApi("nsfw-detector", {
            image: url
        });

        let score = base.round(resp.output.nsfw_score * 100);
        return msg.edit(
            message.author.toString() + ", " +
            (score < 10 ? "🟢" : (score < 50 ? "🟡" : "🔴")) + "\t" +
             score + "% NSFW detected." +
            (isPossibleSensitive ? " (Possibly Sensitive!)" : "") +
            (resp.output.detections.length ?
                ("\n```\n" + resp.output.detections.map(a => "(" + base.round(a.confidence) * 100 + "%)\t" + a.name + " at (" + a.bounding_box[0] + ", " + a.bounding_box[1] + ") " + a.bounding_box[2] + "x" + a.bounding_box[3]).join("\n")) + "\n```" :
                "")
        );
    }
};
