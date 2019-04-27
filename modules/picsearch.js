const base = require("./_base.js");
const RichEmbed = require("discord.js").RichEmbed;

const portal = {
    kon: "http://konachan.net",
    yan: "https://yande.re",
    dan: "https://danbooru.donmai.us"
}

async function fetchList(prov = "kon", tags = [], nsfw = false) {
    return base.req2json(portal[prov] + "/post.json?tags=" + tags.filter(a => {return a.indexOf("rating") == -1 || nsfw}).join('+') + (nsfw ? "" : "+rating:s") + "&limit=100");
}

async function fetchImg(prov = "kon", id) {
    let res = await base.req2json(portal[prov] + "/post.json?tags=id:" + id);
    return res[0];
}

function genEmbed(prov = "kon", image) {
    if (!Object.keys(image).length) throw new Error("Invalid image " + image);

    let embed = new RichEmbed()
        .setAuthor("搜尋結果", "https://cdn4.iconfinder.com/data/icons/alphabet-3/500/ABC_alphabet_letter_font_graphic_language_text_" + prov.substr(0, 1).toUpperCase() + "-64.png")
        .setColor((image["rating"] == "s" ? 0x7df28b : (image["rating"] == "q" ? 0xe4ea69 : 0xd37a52)))
        .setDescription("[ID: " + image["id"] + "](" + portal[prov] + "/post/show/" + image["id"] + ")")

        .setTimestamp()
        .addField("來源: ", (image["source"] == "" ? "(未知)" : image["source"]));

    if (["kon", "yan"].indexOf(prov) > -1) {
        embed.setImage(image["file_url"]);
    } else {
        embed.setImage(image["large_file_url"]);
    }
    return embed;
}

module.exports = {
    trigger: ["konachan", "kona", "yandere", "yan", "danbooru", "dan"],
    event: "message",
    action: async function(trigger, message) {
        let txt = base.extArgv(message.cleanContent);
        let argv = base.parseArgv(txt);

        let prov = trigger.substr(2, 3);
        let nsfw = message.channel.nsfw;

        var _msg = await message.channel.send("`獲取資訊……`");

        //let list = await base.req2json(portal[prov] + "/post.json?tags=" + argv._.filter(a => {return nsfw && a.indexOf("rating") != 0}).join('+') + (nsfw ? "" : "+rating:s") + "&limit=100");
        let list = await fetchList(prov, argv._, nsfw);

        if (!list.length) {
            _msg.edit("`找不到結果。請檢查關鍵字`")
            return;
        }

        let image = base.randArr(list);


        return _msg.edit({
            embed: genEmbed(prov, image)
        });
    },
    fetchList: fetchList,
    fetchImg: fetchImg,
    genEmbed: genEmbed
}
