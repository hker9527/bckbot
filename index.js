const Discord = require('discord.js');
const client = new Discord.Client();
const CredInfo = require("./cred.js");
const _module = require("./modules/_index.js");
const base = require("./modules/_base.js");
const vorpal = require('vorpal')();
const fs = require("fs");

vorpal.command("reload", "Reload modules.").action((a, cb) => {
    _module.getModules((f) => {
        _module.reload(f, () => {
            base.report("Reloaded " + f.length + " modules.");
            cb();
        });
    });
});

var LocalStorage = {};
var channelList = {};

function updateChannelList() {
    channelList = {};
    var guilds = client.guilds.cache.array();
    for (var i in guilds) {
        var channels = guilds[i].channels.cache.array().filter(a => {
            return a.type == "text";
        });
        for (var j in channels) {
            channelList[String(i) + "-" + String(j)] = channels[j]
        }
    }
}

vorpal.command("show_ch", "Show channels.").action((a, cb) => {
    for (var i in channelList) {
        vorpal.log(i, channelList[i].guild.name, channelList[i].name)
    }
    cb();
});

vorpal.command("send [index] [msg...]", "Send message.").autocomplete({
    data: () => {
        return Object.keys(channelList);
    }
}).action((a, cb) => {
    var ch = channelList[a.index];
    ch.send(a.msg.join(" "));
    cb();
}).alias('say');

vorpal.find('exit').remove();
vorpal.command('exit', "Stop server.").action(() => {
    client.destroy();
    base.quit();
}).alias('quit');

vorpal.mode('eval').delimiter('<eval>').description("Enter evaluation mode.").init((a, cb) => {
    vorpal.log("You are now in evaluation mode.\n Type `exit` to exit.");
    cb();
}).action((a, cb) => {
    try {
        vorpal.log(eval(a));
    } catch (e) {
        vorpal.log(e.toString())
    } finally {
        cb();
    }
});

try {
    client.on('ready', async () => {
        vorpal.delimiter('> ').show();
        updateChannelList();
        setInterval(updateChannelList, 1000 * 60 * 60);


        for (let j of Object.values(_module.fileCmd)) {
            let baseArgv = [];

            if (j.argv) {
                baseArgv = j.argv.map(a => {
                    return eval(a)
                });
            }

            if (j.init) {
                try {
                    let fnType = j.init.constructor.name;
                    if (fnType == "Function") {
                        j.init(...baseArgv);
                    } else { // async
                        await j.init(...baseArgv);
                    }
                } catch (e) {
                    base.report(e.message);
                }
            }

            if (j.interval) {
                setInterval(async () => {
                    try {
                        let fnType = j.interval.constructor.name;
                        if (fnType == "Function") {
                            j.interval.f(...baseArgv);
                        } else { // async
                            await j.interval.f(...baseArgv);
                        }
                    } catch (e) {
                        base.report(e.message);
                    }
                }, j.interval.t);
            }
        }
    });

    client.on("messageDelete", async message => {
        for (let baseCmd of Object.values(_module.cmd["messageDelete"])) {
            let baseArgv = [null, message, LocalStorage];
            if (baseCmd.argv) {
                baseArgv = baseArgv.concat(baseCmd.argv.map(a => {
                    return eval(a)
                }));
            }

            try {
                let fnType = baseCmd.action.constructor.name;
                if (fnType == "Function") {
                    baseCmd.action(...baseArgv);
                } else { // async
                    await baseCmd.action(...baseArgv);
                }
            } catch (e) {
                base.pmError(message, e);
            }
        }
    });

    client.on("messageUpdate", message => {

    });

    client.on('message', async (message) => {
        base.report((message.guild ? message.guild.name : "PrivateMessage") + " (" + message.channel.name + ")\t" + message.author.username + ": " + '"' + message.cleanContent + '"' + (message.attachments.array().length ? " [" + message.attachments.array().length + "]" : ""));

        if (message.author != client.user && !message.author.bot) {
            triggerList = Object.keys(_module.cmd.message);

            if (message.content.startsWith("b!") && !message.content.startsWith("b!*")) {
                trigger = message.content.split(" ")[0].substr(2);

                switch (trigger) {
                    case "reload":
                        _module.getModules((f) => {
                            _module.reload(f, (l) => {
                                message.reply("Reloaded ```\n" + l.join("\n") + "```");
                            });
                        });
                        break;
                    default:
                        for (let i of triggerList) {
                            if (trigger == i) {
                                baseArgv = [trigger, message, LocalStorage];
                                baseCmd = _module.cmd["message"][i];
                                if (baseCmd.argv) {
                                    baseArgv = baseArgv.concat(baseCmd.argv.map(a => {
                                        return eval(a)
                                    }));
                                }

                                try {
                                    let fnType = baseCmd.action.constructor.name;
                                    if (fnType == "Function") {
                                        return baseCmd.action(...baseArgv);
                                    } else { // async
                                        return await baseCmd.action(...baseArgv);
                                    }
                                } catch (e) {
                                    message.react('❌');
                                    return base.pmError(message, e);
                                }
                            }
                        }
                        //message.reply("Unknown command " + trigger);
                        message.react(base.randArr(client.emojis.cache.array()));
                        break;
                }
            }

            for (let i of triggerList.filter(a => a.startsWith("*"))) {
                let baseArgv = [null, message, LocalStorage];
                let baseCmd = _module.cmd["message"][i];
                if (baseCmd.argv) {
                    baseArgv = baseArgv.concat(baseCmd.argv.map(a => {
                        return eval(a)
                    }));
                }

                try {
                    let fnType = baseCmd.action.constructor.name;
                    if (fnType == "Function") {
                        baseCmd.action(...baseArgv);
                    } else { // async
                        await baseCmd.action(...baseArgv);
                    }
                } catch (e) {
                    base.pmError(message, e);
                }
            }


        }
    });

    _module.getModules((f) => {
        for (let _f of f) {
            _module.load(_f, () => {
                LocalStorage[_f.slice(0, -3)] = {};
                base.report("Loaded module " + _f);
            });
        }
        client.login((process.argv[2] == "dev" ? CredInfo.dev_token : (process.argv[2] == "beast" ? CredInfo.beast_token : CredInfo.bot_token))).then(() => {
            base.report("Logged in as " + client.user.tag);
        });
    }, true);
} catch (e) {
    base.report("Error occured: " + e.toString())
}
