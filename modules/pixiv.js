const base = require("./_base.js");
const RichEmbed = require("discord.js").RichEmbed;

function pimg(url) {
    return "http://bckps7336.noip.me/pixiv.php?url=" + url;
}

async function fetchInfo(image_id) {
    var res = await base.req2json("https://api.imjad.cn/pixiv/v2/?id=" + image_id);
    if (!res || !res.illust) throw new Error("No image found for id " + image_id);
    return res && res.illust;
}

async function genEmbed(illust, show_image = true, nsfw = false) {
    var embed = new RichEmbed()
        .setAuthor(
            (illust.title || "Pixiv圖片") + (illust.page_count > 1 ? " (" + illust.page_count + ")" : ""),
            pimg(illust.user.profile_image_urls.medium) || "https://png.pngtree.com/svg/20150723/pixiv_btn_897586.png"
        )
        .setColor(illust.sanity_level == 6 ? 0xd37a52 : 0x3D92F5)
        .setTimestamp(new Date(illust.create_date))
        .setImage((show_image && !(illust.sanity_level == 6 && !nsfw)) ? pimg(illust.image_urls.large) : "")
        .addField(
            "Sauce: ",
            "[illust_id: " + illust.id + "](https://www.pixiv.net/member_illust.php?mode=medium&illust_id=" + illust.id + ")\t[作者: " + illust.user.name + "]( https://www.pixiv.net/member.php?id=" + illust.user.id + ")"
        )
        .addField(
            "說明: ",
            illust.caption ? illust.caption.replace(/<br \/>/g, "\n").replace(/<(.|\n)*?>/g, '') : "(無)"
        );

    return embed;
}

module.exports = {
    trigger: ["pixiv"],
    event: "message",
    argv: null,
    action: async function(trigger, message) {
        let txt = base.extArgv(message.cleanContent);
        let argv = base.parseArgv(txt);

        if (trigger == null) { // auto detection
            var image_id = message.content.match(/illust_id=(\d*)/)[1];
        } else if (base.isValid(argv._[0])){
            var image_id = typeof argv._[0] == "number" ? argv._[0] : argv._[0].match(/(\d{1,8})/)[1];
        }

        if (isNaN(image_id)) return;

        let illust = await fetchInfo(image_id);
        return message.channel.send({embed: await genEmbed(illust, true, message.channel.nsfw)});
    },
    pimg: pimg,
    fetchInfo: fetchInfo,
    genEmbed: genEmbed
}
