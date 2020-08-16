const base = require("./_base.js");
const MessageEmbed = require("discord.js").MessageEmbed;

const PixivAppApi = require("pixiv-app-api");
let pixiv;

function pimg(url) {
    return url.replace("i.pximg.net", "i.pixiv.cat");
}

async function fetchInfo(illust_id) {
//    var res = await base.req2json("https://api.imjad.cn/pixiv/v2/?id=" + illust_id);
    var res = await pixiv.illustDetail(illust_id);

    if (!res || !res.illust) {
        base.report("res: " + res);
        throw new Error("No image found for id " + illust_id);
    }
    return res && res.illust;
}

async function genEmbed(illust_id, show_image = true, nsfw = false) {
    let illust = await fetchInfo(illust_id);
    return new MessageEmbed()
        .setAuthor(
            (illust.title || "Pixiv圖片") + (illust.page_count > 1 ? " (" + illust.page_count + ")" : ""),
            pimg(illust.user.profile_image_urls.medium) || "https://png.pngtree.com/svg/20150723/pixiv_btn_897586.png"
        )
        .setColor(illust.sanity_level == 6 ? 0xd37a52 : 0x3D92F5)
        .setTimestamp(new Date(illust.create_date))
        .setImage((show_image && !(illust.sanity_level == 6 && !nsfw)) ? "https://pixiv.cat/" + illust.id + (illust.page_count > 1 ? "-1" : "") + ".jpg" : "")
        .addField(
            "Sauce: ",
            "[illust_id: " + illust.id + "](https://www.pixiv.net/member_illust.php?mode=medium&illust_id=" + illust.id + ")\t[作者: " + illust.user.name + "]( https://www.pixiv.net/member.php?id=" + illust.user.id + ")"
        )
        .addField(
            "說明: ",
            illust.caption ? illust.caption.replace(/<br \/>/g, "\n").replace(/<(.|\n)*?>/g, '').substr(0, 2000) + "..." : "(無)"
        );
}

async function worker(user, pass) {
    pixiv = new PixivAppApi(user, pass, {camelcaseKeys: false});
    await pixiv.login();
};

module.exports = {
    trigger: ["pixiv", "*pixiv"],
    event: "message",
    argv: ["CredInfo.pixiv_user", "CredInfo.pixiv_pass"],
    init: worker,
    interval: {
        f: worker,
        t: 3000 * 1000
    },
    action: async function (trigger, message, LocalStorage, user, pass) {
        let txt = base.extArgv(message, true);
        let argv = base.parseArgv(txt);

        let illust_id;
        if (trigger == null) { // auto detection
            let tmp = message.content.match(/(artworks\/|illust_id=)(\d{1,8})/);
            if (tmp) illust_id = tmp[2];
        } else if (base.isValid(argv[0])) {
            illust_id = typeof argv[0] == "number" ? argv[0] : argv[0].match(/(\d{1,8})/)[1];
        }

        if (!isNaN(illust_id)) {
            await message.channel.send({embed: await genEmbed(illust_id, true, message.channel.nsfw)});

            try {
                return await message.suppressEmbeds(true);
            } catch (e) { // No permission?

            }
        }
    },
    pimg: pimg,
    fetchInfo: fetchInfo,
    genEmbed: genEmbed
};
