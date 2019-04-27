const Discord = require('discord.js');
const client = new Discord.Client();
const CredInfo = require("./cred.js")
const _module = require("./modules/_index.js");
const base = require("./modules/_base.js");
const vorpal = require('vorpal')();
const fs = require("fs");
const https = require("https");

vorpal.command("reload", "Reload modules.").action((a, cb) => {
    _module.getModules((f) => {
        _module.reload(f, () => cb());
    });
});

var channelList = {};

function updateChannelList() {
    channelList = {};
    var guilds = client.guilds.array();
    for (var i in guilds) {
        var channels = guilds[i].channels.array().filter(a => {
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
    ch.send(a.msg.join(" "))
    cb();
}).alias('say');

vorpal.find('exit').remove();
vorpal.command('exit', "Stop server.").action(() => {
    client.destroy();
    base.quit();
}).alias('quit');

vorpal.mode('eval').delimiter('<eval>').description("Enter evaluation mode.").init((a, cb) => {
    vorpal.log("You are now in evaluation mode.\n Type `exit` to exit.")
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
    client.on('ready', () => {
        vorpal.delimiter('> ').show();
        updateChannelList();
        setInterval(updateChannelList, 1000 * 60 * 60);
    });

    client.on("messageDelete", message => {

    });

    client.on("messageUpdate", message => {

    });

    client.on('message', async (message) => {
        if (message.author != client.user) {
            base.report((message.guild ? message.guild.name : "PrivateMessage") + " (" + message.channel.name + ")\t" + message.author.username + ": " + '"' + message.cleanContent + '"' + (message.attachments.array().length ? " [" + message.attachments.array().length + "]" : ""));

            if (message.content.startsWith("b!")) {

                trigger = message.content.split(" ")[0];
                triggerList = Object.keys(_module.cmd.message);

                switch (trigger) {
                    case "b!reload":
                        _module.getModules((f) => {
                            _module.reload(f, (l) => {
                                message.reply("Reloaded ```\n" + l.join("\n") + "```");
                            });
                        });
                        break;
                    default:
                        for (var i in triggerList) {
                            if (trigger === "b!" + triggerList[i]) {
                                baseArgv = [trigger, message];
                                baseCmd = _module.cmd["message"][triggerList[i]];
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
                                    return base.pmError(message, e);
                                }
                            }
                        }
                        message.reply("Unknown command " + trigger);
                        break;
                }
            } else if (message.content.match(/^https?:\/\/(www|touch).pixiv.net.*illust_id=.*/)) {
                if (!_module.cmd.message.pixiv) return;
                try {
                    return await _module.cmd.message.pixiv.action(null, message);
                } catch (e) {
                    return base.pmError(message, e);
                }
            } else if (message.mentions.users.has(client.user.id)) {
                message.reply(["owo?", "uwu?", "b...baka!"][base.urandom({
                    0: 0.5,
                    1: 0.4,
                    2: 0.1
                })]);
            }
        }
    });
    _module.getModules((f) => {
        for (let _f of f) {
            _module.load(_f, () => {
                base.report("Loaded module " + _f);
            });
        }
        client.login((process.argv[2] == "dev" ? CredInfo.dev_token : CredInfo.bot_token)).then(() => {
            base.report("Logged in as " + client.user.tag);
        });
    }, true);
} catch (e) {
    vorpal.log("Error occured: " + e.toString())
}
