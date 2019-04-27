const _module = require("./_index.js");
const base = require("./_base.js");
const m = require("./_math.js");
const fs = require("fs");
const exec = require("child_process").exec;
const {table, getBorderCharacters} = require("table");

const updateData = require("../pc/index.js");

var data = {
    jp: {},
    tw: {}
};

function _t(l) {
    return table(l, {border: getBorderCharacters("void"), columnDefault: {paddingLeft: 0, paddingRight: 3}, drawHorizontalLine: () => {return false}});
}

function doGacha(count = 10, pool = "jp", id = null) {
    if (count != 1) count = 10;
    if (id == null) id = Object.keys(data[pool].chance)[0];

    var got = [];

    for (var i = 0; i < count; i++) {
        result = base.urandom(data[pool].chance[id][(i == 9 ? "10" : "19")]);
        got.push(result);
    }

    return got;
}

function genImage(result, cb) {
    if (result.length == 1) {
        a = result[0];
        path = "./pc/img/" + a + (id[a].star == 3 ? "3" : "1") + "1.png";
        if (fs.existsSync(path)) {
            return cb(path);
        } else {
            return cb("./pc/img/unknown.png");
        }
    } else {
        var string = result.map(a => {
            path = "./pc/img/" + a + (id[a].star == 3 ? "3" : "1") + "1.png";
            if (fs.existsSync(path)) {
                return path;
            } else {
                return "./pc/img/unknown.png";
            }
        }).join(" ");
        var output = "/tmp/gacha-" + base.random(0, 100000) + ".png";

        //base.report("montage " + [string, "-tile", "5x2", "-geometry", "+3+3", "-background", "none", output].join(" "));
        exec("montage " + [string, "-tile", "5x2", "-geometry", "+3+3", "-background", "none", output].join(" "), () => {
            cb(output);
        });
    }
}

var lang, id, info, chance;
var listTxt;
var init_error = null;

function load() {
    for (var lang of ["jp", "tw"]) {
        data[lang] = require("../pc/" + lang + ".json");

        let list = Object.keys(data[lang].id).map(a => {
            return [a, data[lang].id[a].name, "*".repeat(data[lang].id[a].star)]
        });

        data[lang].chaList = "```\n" + _t(list) + "\n```";
    }
}

load();
module.exports = {
    trigger: ["gacha", "gachaj"],
    event: "message",
    argv: null,
    action: async function(trigger, message) {
        let txt = base.extArgv(message.cleanContent);
        let argv = base.parseArgv(txt);

        lang = (trigger == "b!gachaj" ? "jp" : "tw");
        id = data[lang].id;
        info = data[lang].info;
        chance = data[lang].chance;

        var act = argv._[0];
        var done = 0;

        switch (act) {
            case "find":
                return (async () => {
                    var char = argv._[1] && argv._[1].toString();
                    if (!char || Object.keys(id).indexOf(char) == -1) {
                        return message.reply("Invalid char id! See `" + trigger + " chance [gacha_id]` or `" + trigger + " info`");
                    }

                    let gid = argv._[2] && argv._[2].toString();
                    if (!gid || Object.keys(chance).indexOf(gid) == -1) {
                        let avail_gids = Object.keys(chance).filter(a => {return Object.keys(chance[a]["19"]).indexOf(char) > -1});
                        if (avail_gids.length == 0) {
                            return message.reply("Character " + id[char].name + " is not found in current gacha pools.");
                        } else {
                            gid = avail_gids.length == 1 ? avail_gids[0] : avail_gids.sort((a, b) => chance[a]["19"][char] > chance[b]["19"][char] ? -1 : 1)[0];
                        }
                    }

                    if (Object.keys(id).indexOf(char) == -1) return message.reply("No such character id " + char + "! Check `b!gacha list`");
                    msg = await message.channel.send("```\nStarting...\n```");
                    var scount = {1: 0, 2: 0, 3: 0};

                    let result, cont;
                    while (!result || result.indexOf(char) == -1) {
                        done++;
                        result = doGacha(10, lang, gid);
                        result.map(a => {scount[id[a].star]++});
                        let _res = result.map(a => {return "*".repeat(id[a].star) + " " + id[a].name + " " + base.round(m.m(chance[gid]["19"][a], 100)) + "%"});
                        cont = "```\n" + "Round " + done + "\n" + _t([_res.slice(0, 5), _res.slice(5, 10)]) + "\n```";
                        if (done % 20 == 0) {
                            msg = await msg.edit(cont);
                        }
                    }

                    return genImage(result, async (output) => {
                        msg.delete();
                        await message.channel.send(cont + "`" + Object.keys(scount).map(a => {return "*".repeat(a) + ": " + scount[a]}).join(", ") + "`", {file: output});
                        if (output.indexOf("tmp") > -1) fs.unlink(output, () => {});
                    });
                })();
            case "update":
                let res = await updateData();
                _module.unload("../pc/jp.json");
                _module.unload("../pc/tw.json");
                load();
                return message.reply("Updated!");
            case "info":
                return (() => {
                    return message.reply("```\n" + JSON.stringify(Object.values(info), null, 4) + "\n```");
                })();
            case "chance":
                return (() => {
                    let gid = argv._[1];
                    if (!gid || Object.keys(chance).indexOf(gid.toString()) == -1) {
                            return message.reply("Invalid gacha id! See `" + trigger + " info`");
                    }
                    let _list = Object.keys(chance[gid]["19"]).map(i => {
                        return [i, id[i].name, base.round(m.m(chance[gid]["19"][i], 100), 6) + "%", chance[gid]["10"][i] ? (chance[gid]["10"][i] != chance[gid]["19"][i] ? base.round(m.m(chance[gid]["10"][i], 100), 6) + "%" : "--") : "--"]
                    }).sort((a, b) => {
                        [_a, _b] = [a[0], b[0]];
                        return id[_a].star > id[_b].star ? 1 : (id[_a].star == id[_b].star && chance[gid]["19"][_a] > chance[gid]["19"][_b] ? 1 : -1);
                    })

                    let first = true;
                    while (_list.length > 0) {
                        let txt = "```\n" + _t([["ID", "Name", "1-9", "10"], ..._list.splice(0, 20)]) + "\n```";
                        message.channel.send(txt);
                    }

                    return true;
                })();
            case "char":
                return (() => {
                    let txt = [];

                    var char = argv._[1] && argv._[1].toString();
                    if (!char || Object.keys(id).indexOf(char) == -1) {
                        return message.reply("Invalid char id! See `" + trigger + " chance [gacha_id]` or `" + trigger + " info`");
                    }

                    let avail_gids = Object.keys(chance).filter(a => {return Object.keys(chance[a]["19"]).indexOf(char) > -1});
                    if (avail_gids.length == 0) {
                        return message.reply("Character " + id[char].name + " is not found in current gacha pools.");
                    } else {
                        for (var i of avail_gids) {
                            txt.push(i + " (" + info[i].name + "):\n" +
                                [0.25, 0.5, 0.75, 0.9, 0.99].map(a => {
                                    // 10 - 9(1-a)^n - (1-b)^n = p
                                    // a = 19, b = 10
                                    let _prob = [chance[i]["19"][char], chance[i]["10"][char]];
                                    if (_prob[0] == _prob[1]) {
                                        return a * 100 + "%: " + base.round(m.d(Math.log(1 - a), Math.log(1 - _prob[0])) / 10)
                                    } else {
                                        let n = 0;
                                        while (n += 0.01) {
                                            if ((10 - 9 * Math.pow(1 - _prob[0], n) - Math.pow(1 - _prob[1], n)) >= a) {
                                                return a * 100 + "%: (" + base.round(n) + ")";
                                            }
                                        }
                                    }
                                }).join(", "));
                        }
                        return message.reply("```\n" + txt.join("\n") + "\n```");
                    }

                })();
            default:
                return (() => {
                    let gid = argv._[2];
                    if (!gid || Object.keys(chance).indexOf(gid.toString()) == -1) {
                        gid = Object.keys(chance)[0];
                    }
                    let result = doGacha(parseInt(act), lang, gid);
                    //Object.values(result).map(a => {scount[a.star]++});

                    return genImage(result, async (output) => {
                        let _res = Object.values(result).map(a => {return "*".repeat(id[a].star) + " " + id[a].name + " " + base.round(m.m(chance[gid]["19"][a], 100)) + "%"});
                        await message.channel.send("```\n" + (_res.length == 1 ? _res[0] : _t([_res.slice(0, 5), _res.slice(5, 10)])) + "\n```", {file: output});
                        if (output.indexOf("tmp") > -1) fs.unlink(output, () => {});
                    });
                })();
        }
    }
}
