const base = require("./_base.js");
const sqlite = require("sqlite");
const osu = require("./_osu.js");

var db;
sqlite.open("data.db", {Promise}).then(d => db = d).catch(e => {throw e;});

module.exports = {
    trigger: ["link"],
    event: "message",
    action: async function(trigger, message, LocalStorage) {
        let txt = base.extArgv(message);
        let argv = base.parseArgv(txt);

        if (!base.isValid(argv[0])) {
            return message.reply("請指示要連結的賬號。");
        }

        let exist = db.all("select * from osu_user where id = \'" + message.author.id + "\'");

        if (exist.length) {
            return message.reply("你已經連結過了。");
        }

        var osu_name = argv.map(a => {
            return a.toString()
        }).join('_'); // number may exist

        let list = await osu.getUser({
            u: osu_name
        });

        if (!list.length) {
            return message.channel.send("無法獲取賬號 `" + osu_name + "` 訊息。請檢查賬號可用性。");
        }

        let osu_id = list[0]["user_id"];

        await db.run("insert into osu_user values (\'" + message.author.id + "\', \'" + osu_id + "\')");

        return message.channel.send("已將 " + message.author.toString() + " 與 Osu! ID " + osu_name + " 配對。");
    }
};
