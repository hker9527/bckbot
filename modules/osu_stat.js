const base = require("./_base.js");
const RichEmbed = require("discord.js").RichEmbed;
const osu = require("./_osu.js");
const math = require("./_math.js");
const sqlite = require("sqlite");
const API_KEY = require("../cred.js").osu_api;

var db;
sqlite.open("osu.db", {Promise}).then(d => db = d).catch(e => {throw e;});

function _avg(values) {
    var sum = values.reduce(function(sum, value) {
        return sum + value;
    }, 0);

    var avg = sum / values.length;
    return avg;
}

function sd(values) {
    var avg = _avg(values);

    var squareDiffs = values.map(function(value) {
        var diff = value - avg;
        var sqrDiff = diff * diff;
        return sqrDiff;
    });

    var avgSquareDiff = _avg(squareDiffs);

    var stdDev = Math.sqrt(avgSquareDiff);
    return stdDev;
}

module.exports = {
    trigger: Object.keys(osu.modeTrigger),
    event: "message",
    action: async function(trigger, message) {
        let txt = base.extArgv(message.content);
        let argv = base.parseArgv(txt);

        let m = osu.parseOsuMode(trigger.substr(2));

        let sql = "select * from users where chat_id = \'";

        let user;

        if (base.isValid(argv._[0])) { // specify user
            if (argv._[0].substr(0, 2) == "<@") { // mention
                sql += argv._[0].match(/<@\!?(\d*)>/)[1];
            } else {
                user = argv._.join(" ");
            }
        } else { // Not given, use himself
            sql += message.author.id;
        }

        sql +=  "\'";

        let r = await db.get(sql);
        if (base.isValid(r)) {
            user = r.osu_id;
        } else if (!user) {
            return message.reply("請先使用 b!link [ID] 配對Osu! ID, or specify ID.");
        }

        let msg = await message.channel.send("`獲取用戶資訊……`");

        let list = await osu.getUser({
            u: user,
            m: m
        });

        if (!list.length) {
            return msg.edit("無法獲取賬號 `" + user + "` 訊息，請檢查賬號可用性。");
        }

        var user_info = list[0];
        var osu_name = user_info["username"];
        osu_id = user_info["user_id"];
        let bp = await osu.getUserBest({
            u: osu_id,
            m: m
        });

        if (user_info["pp_rank"] == null) {
            return msg.edit("該玩家從未遊玩！");
        }
        var pp = bp.map(a => a.pp);
        //pp.pop();

        var embed = new RichEmbed()
            .setAuthor("Osu! " + osu.mode[m].full, osu.mode[m].icon)
            .setColor(osu.mode[m].color)
            .setTitle("用戶: " + osu_name)
            .setThumbnail("https://a.ppy.sh/" + osu_id + "?" + Math.round(new Date().setHours(0, 0, 0, 0) / 1000) + ".png")
            .setDescription("#" + user_info["pp_rank"] + " (" + user_info["country"] + " :flag_" + user_info["country"].toLowerCase() + ": #" + user_info["pp_country_rank"] + ")")
            .addField("等級: ", user_info["level"], true)
            .addField("PP: ", user_info["pp_raw"] + " (Raw: " + base.round(pp.reduce((a, b) => a + b), 3) + ")", true)
            .addField("準確度: ", base.round(user_info["accuracy"], 3) + "%", true)
            .addField("遊玩次數: ", user_info["playcount"], true)
            .addField("300 / 100 / 50", [user_info["count300"], user_info["count100"], user_info["count50"]].join(" / "), true)
            .addField("SS / SS+ / S / S+ / A", [user_info["count_rank_ss"], user_info["count_rank_ssh"], user_info["count_rank_s"], user_info["count_rank_sh"], user_info["count_rank_a"]].join(" / "), true)
            .addField("計分分數 / 總分數", parseInt(user_info["ranked_score"]).toExponential(2) + " / " + parseInt(user_info["total_score"]).toExponential(2) + " (1:" + base.round(parseInt(user_info["total_score"]) / parseInt(user_info["ranked_score"]), 3) + ")" , true)
            .addField("PP差: ", base.round(pp[0], 1) + " - " + base.round(pp[pp.length - 1], 1) + " = " + base.round(pp[0] - pp[pp.length - 1], 1) + " (" + base.round(sd(pp), 2) + " S.D)", true)
            .setURL("https://osu.ppy.sh/users/" + osu_id)
        return msg.edit({
            embed
        });
    }
}
