const base = require("./_base.js");

module.exports = {
    trigger: ["dice", "d"],
    event: "message",
    action: async function (trigger, message, LocalStorage) {
        let txt = base.extArgv(message, true);
        let argv = base.parseArgv(txt);

        let re = /^(\d*)d(\d*)([+-]\d*)?$/;
        let tmp;
        if (!base.isValid(argv[0]) || !(tmp = argv[0].match(re))) {
            return message.reply("Format: __n__d__f__[+-o]\nn: Number of dice\tf: Faces\to: Offset");
        } else { // ndf+o
            [_, n, f, o] = tmp.map(a => parseInt(a));
            if (n > 500) return message.reply("Too much dice!");
            let res = 0;
            for (var i = 0; i < n; i++) {
                res += base.random(1, f);
            }
            res += (!isNaN(o) ? o : 0);
            return message.reply("\nRolling a " + f + "-faced dice for " + n + " times" + (!isNaN(o) ? " with " + o + " offset" : "") + ".\nResult: `" + res + "`");
        }
    }
};
