const base = require("./_base.js");
const exec = require('child_process').exec;
const fs = require("fs");

module.exports = {
    trigger: ["neko"],
    event: "message",
    action: function(trigger, message) {
        let txt = base.extArgv(message.cleanContent);
        let argv = txt.split(" ");

        if (base.isValid(argv[0])) {
            if (/^\d+$/.test(argv[0])) {
                var len = String(argv[0]).length
                var string = String(argv[0]).split("").map((a) => {return "neko/" + a + ".png"}).join(" ");
                var output = "/tmp/" + base.random(0, 100000) + ".png";
                exec("montage " + [string, "-tile", len + "x1", "-geometry", "+0+0", "-background", "none", output].join(" "), () => {
                    message.channel.send("", {file: output}).then(() => {
                        fs.unlink(output, () => {});
                    });
                });
            } else {
                message.reply("Invalid format!");
            }
        } else {
            message.reply("Please specify number!");
        }
    }
}
