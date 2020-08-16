const base = require("./_base.js");
const xml2json = require("xml2json").toJson;
const pixiv = require("./pixiv.js");
const fs = require("fs");

async function _req(n) {
    return JSON.parse(xml2json(await base._req("https://rakuen.thec.me/PixivRss/" + n + "-30")));
}

var dict = {
    d: "daily",
    d18: "daily_r18",
    w: "weekly",
    w18: "weekly_r18",
    m: "monthly",
    o: "daily",
    r: "rookie",
    male: "male",
    male18: "male_r18",
    female: "female",
    female18: "female_r18"
};

var data = {
    d: null,
    d18: null,
    w: null,
    w18: null,
    m: null,
    o: null,
    r: null,
    male: null,
    male18: null,
    female: null,
    female18: null
};

async function worker() {
    for (let type of Object.keys(dict)) {
        data[type] = await _req(dict[type]);
        data[type].rss.channel.lastBuildDate = +new Date(data[type].rss.channel.lastBuildDate.replace(" +8000", ""));
    }
}

module.exports = {
    trigger: Object.keys(dict).map(a => "p" + a),
    event: "message",
    init: worker,
    interval: {
        f: worker,
        t: 86400 * 1000
    },
    action: async function (trigger, message, LocalStorage) {
        let txt = base.extArgv(message, true);
        let argv = base.parseArgv(txt);

        let type = trigger.substr(1);

        let picLink = base.randArr(data[type].rss.channel.item).link;

        message.channel.send({embed: await pixiv.genEmbed(picLink.match(/illust_id=(\d*)/)[1], true, message.channel.nsfw)});
    }
};
