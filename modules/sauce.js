const base = require("./_base.js");
const pixiv = require("./pixiv.js");
const picsearch = require("./picsearch.js");
const imageRe = /(https?:\/\/[^\s]+?\.(gif|bmp|svg|png|jpg|jpeg))/ig;
const CredInfo = require('../cred.js');

function findImageFromMessages(index, msgs, message) {
    let i = 0, url;
    for (let a of msgs.filter(a => a.author.id !== message.client.user.id)) {
        for (let e of a.embeds.reverse()) {
            if (i == index) {
                if (e.image || e.type == "image") {
                    if (e.provider && e.provider.name == "Imgur") {
                        url = e.thumbnail.url;
                    } else {
                        url = e.image ? e.image.url : e.url;
                    }
                    break;
                } else if (e.type == "gifv") {
                    url = e.thumbnail.url;
                    break;
                }
            } else {
                i++;
            }
        }
        if (url) return url;

        for (let atta of a.attachments.array()) {
            if (atta.width > 0) {
                if (i == index) {
                    url = atta.url;
                    break;
                } else {
                    i++;
                }
            }
        }
        if (url) return url;
    }
}
module.exports = {
    trigger: ["sauce"],
    event: "message",
    action: async function (trigger, message, LocalStorage) {
        let txt = base.extArgv(message, true);
        let argv = base.parseArgv(txt);

        let index = 0;

        if (!isNaN(argv[0])) {
            _index = parseInt(argv[0]);
            if (Math.abs(_index) <= 100) index = Math.abs(_index);
        }

        let msgs = (await message.channel.messages.fetch({limit: 100})).array();

        let url = findImageFromMessages(index, msgs, message);
        if (!url) return message.reply("No valid image in history!");

        let msg = await message.channel.send("Querying image `" + url + "`...");

        let res = await base.req2json("https://saucenao.com/search.php?api_key=" + CredInfo.saucenao_key + "&db=999&output_type=2&numres=1&url=" + url);

        if (res.header.status == 0) {
            if (res.results == null) return msg.edit("No sauce found!");

            let tableText = Object.keys(res.results[0].data).map(a => a + ": " + res.results[0].data[a]).join("\n");
            let sim = parseFloat(res.results[0].header.similarity);

            let embed;
            try {
                if (res.header.index[res.results[0].header.index_id].parent_id == 5) { // Pixiv
                    embed = await pixiv.genEmbed(res.results[0].data.pixiv_id, false);
                } else if (res.header.index[res.results[0].header.index_id].parent_id == 12) {
                    embed = await picsearch.genEmbed("yan", res.results[0].data.yandere_id, false);
                } else if (res.header.index[res.results[0].header.index_id].parent_id == 26) {
                    embed = await picsearch.genEmbed("kon", res.results[0].data.konachan_id, false);
                } else if (res.header.index[res.results[0].header.index_id].parent_id == 9) {
                    embed = await picsearch.genEmbed("dan", res.results[0].data.danbooru_id || res.results[0].data.gelbooru_id, false);
                } else {
                    return msg.edit("Confidence level: " + sim + "%\n```" + tableText + "```");
                }
                return msg.edit((sim < 70 ? "||" : "") + "Confidence level: " + sim + "%" + (sim < 70 ? " ||" : ""), {embed});
            } catch (e) {
                base.pmError(message, e);
                return msg.edit("Confidence level: " + sim + "%\n```" + tableText + "```");
            }
        } else {
            await msg.edit(res.header.message.replace(/<a href="(.+?)".*?>/g, (a, b) => "[" + b.replace(/&amp;/g, "&") + "]")
                .replace(/<\/?.+?>/g, "\n").replace(/\n+/g, "\n").trim() // convert tags to newlines
                .split("\n").slice(1).join("\n"));
            throw new Error("Header code: " + header.code);
        }
    },
    findImageFromMessages
};
