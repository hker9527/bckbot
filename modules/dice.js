const base = require("./_base.js");

module.exports = {
    trigger: ["dice", "d"],
    event: "message",
    action: function(trigger, message) {
        let txt = base.extArgv(message.cleanContent);
        let argv = base.parseArgv(txt);

        if (!base.isValid(argv._[0]) || !argv._[0].match(/(\d*)d(\d*)([+-]\d*)?/)) {
            message.reply("Format: __n__d__f__[+-o]\nn: Number of dices\tf: Faces\to: Offset");
        } else { // ndf+o
            [_, n, f, o] = argv._[0].match(/(\d*)d(\d*)([+-]\d*)?/).map(a => {
                return parseInt(a)
            });
            if (n > 500) return message.reply("Too much number!");
            res = 0;
            for (var i = 0; i < n; i++) {
                res += base.random(1, f) + (!isNaN(o) ? o : 0);
            }
            return message.reply("\nRolling a " + f + "-faced dice for " + n + " times.\nResult: `" + res + "`");
        }
    }
}
