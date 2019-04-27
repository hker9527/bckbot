const base = require("./_base.js");
const CredInfo = require("../cred.js");
const pixiv = require("./pixiv.js");
const deepai = require("deepai");
deepai.setApiKey(CredInfo.deepai);

module.exports = {
    trigger: ["nudity"],
    event: "message",
    action: async function(trigger, message) {
        let txt = base.extArgv(message.cleanContent);
        let argv = base.parseArgv(txt);

        if ((base.isValid(argv._[0]) && argv._[0].toString().match(/(https?:\/\/[^\s]+)/))) {
            if (argv._[0].toString().match(/^https?:\/\/(www|touch).pixiv.net.+?illust_id=\d+/)) {
                url = pixiv.pimg((await pixiv.fetchInfo(argv._[0].match(/illust_id=(\d+)/)[1])).image_urls.large);
            } else {
                url = argv._[0]
            }
        } else if (message.attachments.array().length) {
            url = message.attachments.array()[0].url
        } else {
            return message.reply("No Image Found!");
        }

        var resp = await deepai.callStandardApi("nsfw-detector", {
            image: url
        });

        return message.reply(
            resp.output.nsfw_score * 100 + "% NSFW detected." +
            (resp.output.detections.length ?
                ("\n```\n" + resp.output.detections.map(a => "(" + (a.confidence * 100) + "%)\t" + a.name + " at (" + a.bounding_box[0] + ", " + a.bounding_box[1] + ") " + a.bounding_box[2] + "x" + a.bounding_box[3]).join("\n")) + "\n```" :
                "")
            );
    }
}
