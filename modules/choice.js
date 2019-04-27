const base = require("./_base.js");

module.exports = {
    trigger: ["cho", "choice", "choices"],
    event: "message",
    action: function(trigger, message) {
        try {
            let txt = base.extArgv(message.content);
            let argv = base.parseArgv(txt);

            function shuffleArray(array) {
                for (let i = array.length - 1; i > 0; i--) {
                    let j = base.random(0, i);
                    [array[i], array[j]] = [array[j], array[i]];
                }
            }

            argv = argv._;
            argv = argv.filter((v, i, a) => a.indexOf(v) === i);

            if (argv.length < 3) {
                return message.reply("Not enough choices");
            }

            var question = argv.shift();
            var last = argv.pop();
            shuffleArray(argv);

            var pMax = 1;
            var o = [];

            for (var i in argv) {
                var p = base.random(0, pMax * 100000) / 100000;
                o.push([argv[i], p]);
                pMax = pMax - p;
            }
            o.push([last, pMax]);
            return message.reply("Result of " + question + ": " + o.sort((a, b) => {
                return b[1] - a[1];
            }).map(a => {
                return a[0] + " (" + base.round(a[1] * 100, 3) + "%)";
            }).join(" "));
        } catch (e) {
            base.pmError(message, e.stack);
        }
    }
}
