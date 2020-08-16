const base = require("./_base.js");
const atk_tools = ["碎凌吟", "軒轅劍", "盤古斧", "雷罰劍", "閻魔刀", "火蜥蜴之鱗", "煞靈", "破血", "鳳羽弓", "妖祖陰陽矛", "草泥馬之劍"];

module.exports = {
    trigger: ["slap", "slaps"],
    event: "message",
    action: function(trigger, message, LocalStorage) {
        let txt = base.extArgv(message);
        let argv = base.parseArgv(txt);

        if (base.isValid(argv[0])) {
            victim = argv.shift();
            atkTool = argv.join(" ");

            if (!atkTool.length) {
                atkTool = base.randArr(atk_tools);
            }
            return message.channel.send(message.author.toString() + " 使用了 " + atkTool + " 來攻擊 " + victim + "，造成了 " + base.urandom(base.arr2obj([base.random(50, 100), base.random(100, 300), base.random(300, 600), base.random(600, 1000)], [0.1, 0.6, 0.2, 0.1])) + " 點傷害");
        } else {
            return message.reply("請指示要攻擊的對象");
        }
    }
};
