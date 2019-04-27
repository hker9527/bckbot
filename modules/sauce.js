const base = require("./_base.js");
const request = require("request-promise");
const pixiv = require("./pixiv.js");
const picsearch = require("./picsearch.js");
const imageRe = /(https?:\/\/[^\s]+?\.(png|jpg))/;

module.exports = {
    trigger: ["sauce"],
    event: "message",
    argv: null,
    action: async function(trigger, message) {
        let txt = base.extArgv(message.cleanContent);
        let argv = base.parseArgv(txt);

        let url;
        if (base.isValid(argv._[0]) || message.attachments.array().length) {
            url = argv._[0] || message.attachments.array()[0].url;
            if (!url.match(imageRe)) {
                return message.reply("Provided URL is not image!");
            }
        } else {
            let res = (await message.channel.fetchMessages({limit: 100})).array();
            for (let a of res.filter(a => a.author.id != message.client.user.id)) {
                if (a.content.match(imageRe)) {
                    url = a.content.match(imageRe)[0]
                    break
                } else if (a.attachments.array().filter(a => a.width).length) {
                    url = a.attachments.array().filter(a => a.width)[0].url
                    break;
                }
            }

            if (!url) return message.reply("No valid image in history!");
        }

        let res = await request.get("http://saucenao.com/search.php?db=999&url=" + url);
        let result = res.match(/<table class="resulttable">.+?<\/table>/);
        if (result) {
            let i = result[0];
            let sim = i.match(/<div class="resultsimilarityinfo">(\d+.\d+%)<\/div>/)[1];
            let title = i.match(/<div class="resulttitle"><strong>(.+?)<\/strong>/)[1];

            let contents = i.match(/<div class="(resultcontentcolumn|resultmiscinfo)">(.+?)<\/div>/g);
            for (let content of contents) {
                let embed;
                try {
                    switch (true) {
                        case content.indexOf("Pixiv") > -1:
                            embed = await pixiv.genEmbed(await pixiv.fetchInfo(i.match(/illust_id=(\d+)/)[1]), false, message.channel.nsfw);
                            break;
                        case content.indexOf("yande.re") > -1:
                            embed = picsearch.genEmbed("yan", await picsearch.fetchImg("yan", i.match(/yande\.re\/post\/show\/(\d+)/)[1]));
                            break;
                        case content.indexOf("konachan") > -1:
                            embed = picsearch.genEmbed("kon", await picsearch.fetchImg("kon", i.match(/konachan\.com\/post\/show\/(\d+)/)[1]));
                            break;
                        case content.indexOf("danbooru") > -1:
                            embed = picsearch.genEmbed("dan", await picsearch.fetchImg("dan", i.match(/danbooru\.donmai\.us\/post\/show\/(\d+)/)[1]));
                            break;
                        default:
                            break;
                    }
                } catch (e) {
                    return message.reply(e.message);
                }
                if (embed) {
                    return message.channel.send("Confidence level: " + sim, { embed });
                }
            }
            base.pm(message, "```\n" + i + "\n```");
            return message.channel.send(
                "Confidence level: " + result[0].match(/<div class="resultsimilarityinfo">(\d+.\d+%)<\/div>/)[1] +
                "\n```\n" +
                result[0].replace(/<\/?.+?>/g, "\n").replace(/\n+/g, "\n") +
                "\n```"
            );
        } else if (res.match(/was denied/)) {
            return message.reply("Access denied to the file");
        } else {
            return message.reply("No sauce found!");
        }

    }
}
