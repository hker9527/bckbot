const base = require("./_base.js");
const exec = require("child_process").exec;
const execSync = require("child_process").execSync;
const fs = require("fs");

module.exports = {
    trigger: ["emolist", "emo", "emoji"],
    event: "message",
    action: function(trigger, message, LocalStorage) {
        let txt = base.extArgv(message, true);
        let argv = base.parseArgv(txt);

        switch (trigger) {
            case "emolist":
                emos = message.guild.emojis.keyArray();

                if (!emos.length) {
                    return message.reply("No emojis found!", () => {});
                }

                for (var id of emos) {
                    path = "emoji/" + id + ".png";
                    if (!fs.existsSync(path)) {
                        execSync("wget -O " + path + " --quiet \"" + "https://cdn.discordapp.com/emojis/" + id + ".png" + "\"");
                        execSync("convert -background transparent -gravity center " + path + " -resize 72x72 -extent 72x72 " + path);
                    }
                }


                var string = emos.map(a => {
                    return "emoji/" + a + ".png";
                }).join(" ");
                var output = "/tmp/emoji-" + base.random(0, 100000) + ".png";

                exec("montage " + [string, "-geometry", "+3+3", "-background", "none", output].join(" "), () => {
                    message.channel.send(emos.length + " emojis detected.", {
                        file: output
                    }).then(() => {
                        fs.unlink(output, () => {})
                    });
                });
                break;
            default:
                emos = [];

                for (var i in argv) {
                    res = argv[i].match(/<:.{2,32}:(\d{18})>/g);
                    if (res) { // custom emoji
                        for (var id of res.map(a => a.match(/<:.{2,32}:(\d{18})>/)[1])) {
                            path = "emoji/" + id + ".png";
                            if (!fs.existsSync(path)) {
                                execSync("wget -O " + path + " --quiet \"" + "https://cdn.discordapp.com/emojis/" + id + ".png" + "\"");
                                execSync("convert -background transparent -gravity center " + path + " -resize 72x72 -extent 72x72 " + path);
                            }
                            emos.push(id);
                        }
                    } else { // built-in emoji?
                        res = twemoji.parse(argv[i]).match(/72x72\/.{2,45}.png/g);
                        if (res) {
                            emos = emos.concat(res.map(a => {
                                return a.replace("72x72/", "").replace(".png", "")
                            }))
                        }
                    }
                }

                if (!emos.length) {
                    return message.reply("No emojis found!", () => {});
                }
                var string = emos.map(a => {
                    return "emoji/" + a + ".png";
                }).join(" ");
                var output = "/tmp/emoji-" + base.random(0, 100000) + ".png";

                execSync("montage " + [string, "-tile", emos.length + "x1", "-geometry", "+3+3", "-background", "none", output].join(" "));

                message.channel.send(emos.length + " emojis detected.", {
                    file: output
                }).then(() => {
                    fs.unlink(output, () => {})
                });
                break;
        }
    }
};
