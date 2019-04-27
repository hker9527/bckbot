const base = require("./_base.js");

module.exports = {
    trigger: ["roll"],
    event: "message",
    action: function(trigger, message) {
        let txt = base.extArgv(message.cleanContent);
        let argv = base.parseArgv(txt);
        var s = 100;
        var max = argv._[0];
        if (!isNaN(max)) {
            s = parseInt(max);
            s = Number.isInteger(s) ? s : 100;
        }
        return message.channel.send(message.author + " 轉出了 " + base.random(0, s) + " 點。");
    }
}
