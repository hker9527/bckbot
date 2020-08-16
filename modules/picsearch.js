const base = require("./_base.js");
const MessageEmbed = require("discord.js").MessageEmbed;

const portal = {
    kon: "http://konachan.net",
    konachan: "http://konachan.net",
    yan: "https://yande.re",
    yandere: "https://yande.re",
    dan: "https://danbooru.donmai.us",
    danbooru: "https://danbooru.donmai.us"
};

async function fetchList(prov = "kon", tags = [], nsfw = false) {
    return base.req2json(portal[prov] + "/post.json?tags=" + tags.filter(a => {return a.indexOf("rating") == -1 || nsfw}).join('+') + (nsfw ? "" : "+rating:s") + "&limit=100");
}

async function fetchImg(prov = "kon", id) {
    let res = await base.req2json(portal[prov] + "/post.json?tags=id:" + id);
    return res[0];
}

async function genEmbed(prov = "kon", obj, show = false, nsfw = false) {
    let image;
    if (typeof obj == "number") image = await fetchImg(prov, obj); // from sauce
    else image = obj;

    if (!Object.keys(image).length) throw new Error("Invalid image " + image);

    let embed = new MessageEmbed()
        .setAuthor("搜尋結果", "https://cdn4.iconfinder.com/data/icons/alphabet-3/500/ABC_alphabet_letter_font_graphic_language_text_" + prov.substr(0, 1).toUpperCase() + "-64.png")
        .setColor((image["rating"] == "s" ? 0x7df28b : (image["rating"] == "q" ? 0xe4ea69 : 0xd37a52)))
        .setDescription("[ID: " + image["id"] + "](" + portal[prov] + "/post/show/" + image["id"] + ")")
        .setTimestamp()
        .addField("來源: ", (image["source"] == "" ? "(未知)" : image["source"].replace("pximg.net", "pixiv.cat")));

    if (show && (image['rating'] != "s" || nsfw)) {
        if (["kon", "yan"].includes(prov)) {
            embed.setImage(image["file_url"]);
        } else {
            embed.setImage(image["large_file_url"]);
        }
    }
    return embed;
}

module.exports = {
    trigger: Object.keys(portal),
    event: "message",
    action: async function (trigger, message, LocalStorage) {
        let txt = base.extArgv(message, true);
        let argv = base.parseArgv(txt);

        let prov = trigger.substr(0, 3);
        let nsfw = message.channel.nsfw;

        var _msg = await message.channel.send("`獲取資訊……`");

        let list = await fetchList(prov, argv, nsfw);

        if (!list.length) {
            _msg.edit("`找不到結果。請檢查關鍵字`");
            return;
        }

        let image = base.randArr(list);

        return _msg.edit("", {
            embed: await genEmbed(prov, image, true, message.channel.nsfw)
        });
    },
    fetchList: fetchList,
    fetchImg: fetchImg,
    genEmbed: genEmbed
};
