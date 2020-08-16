const base = require("./_base.js");
const osu = require("./_osu.js");
const fs = require("fs");
const sqlite = require("sqlite");
const MessageEmbed = require("discord.js").MessageEmbed;

var db;
sqlite.open("data.db", {Promise}).then(d => db = d).catch(e => {throw e;});

function sec2str(s) {
    return parseInt(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
}

function equalDate(d1, d2) {
    return Math.abs(d1 - d2) < 10 * 1000;
}

function hl(s, b = true) {
    return (b ? "**" : "") + s + (b ? "**" : "");
}

module.exports = {
    trigger: ["rs", "rt", "rc", "rm"],
    event: "message",
    action: async function(trigger, message, LocalStorage) {
        try {
            let txt = base.extArgv(message);
            let argv = base.parseArgv(txt);

            let m = osu.parseOsuMode(trigger.substr(1));

            let sql = "select * from osu_user where id = \'";

            let u;

            if (base.isValid(argv[0])) {	// specify user
                if (argv[0].substr(0, 2) === "<@") {	// mention
                    sql += argv[0].match(/<@\!?(\d*)>/)[1];
                } else {
                    u = argv.join(" ");
                }
            } else {	// Not given, use himself
                sql += message.author.id;
            }

            sql +=  "\'";
            if (!u) {
                let r = await db.get(sql);
                if (base.isValid(r)) {
                    u = r.osu_id;
                } else {
                    return message.reply("請先使用 b!link [ID] 配對Osu! ID, or specify ID.");
                }
            }

            var statusMsg       = await message.channel.send("```\n" + base.timeFormat() + "\t" + "Process started.\n```");
            statusMsg.addText   = async function (t) {
                return this.edit(this.content.substr(0, this.content.length - 4) + "\n" + base.timeFormat() + "\t" + t + "\n```");
            };

            const userInfo      = (await osu.getUser({u: u}))[0];
            if (!userInfo) {
                return statusMsg.edit("Unknown user `" + u + "`.");
            }
            var _userRecent     = await osu.getUserRecent({u: u, limit: 50, m: m});
            var userRecent      = _userRecent[0];

            if (!userRecent) {
                return statusMsg.edit("No recent play found for user `" + userInfo.username + "`.");
            }

            var b               = userRecent.beatmap_id;
            var retryCount      = _userRecent.filter(a => {return a.beatmap_id == b}).length;

            var bmap            = (await osu.getBeatmaps({b: b, m: m, a: 1, mods: userRecent.enabled_mods & (2 | 16 | 64 | 256)}))[0]; 	// Recent beatmap info

            var ret             = {
                time: userRecent.date,
                pmeta: {
                    username: userInfo.username,
                    userid: userInfo.user_id
                },
                bmeta: {
                    bid:            b,
                    sid:            bmap.beatmapset_id,
                    beatmap:        bmap.artist + " - " + bmap.title + " [" + bmap.version + "]",
                    star: {
                        htotal:     false,
                        total:      base.round(bmap.difficultyrating, 2),
                        star_aim:   base.round(bmap.diff_aim, 2),
                        star_speed: base.round(bmap.diff_speed, 2),
                        star_strain:base.round(bmap.diff_strain, 2),
                    },
                    bpm:            bmap.bpm,
                    length:         bmap.total_length,
                    diff: {
                        hCS:        false,
                        hAR:        false,
                        hHP:        false,
                        hOD:        false,

                        CS:         bmap.diff_size,
                        AR:         bmap.diff_approach,
                        HP:         bmap.diff_drain,
                        OD:         bmap.diff_overall
                    }
                },
                mode: {
                    mode:           m,
                    text:           osu.mode[m].text,
                    color:          osu.mode[m].color
                },
                score: {
                    mod:            osu.parseOsuMod(userRecent.enabled_mods).join(" "),
                    noteDesc:       osu.mode[m].scoretext.join(" / "),
                    note:           osu.mode[m].score.map(a => {return userRecent[a]}).join(" / "),
                    score:          userRecent.score,
                    rank:           userRecent.rank,
                    acc:            base.round(osu.mode[m].acc(userRecent), 2) + "%",
                    combo:          hl(userRecent.maxcombo + "x / " + (bmap.max_combo === null ? "???" : bmap.max_combo) + "x", userRecent.perfect == "1"),
                    retryCount:     retryCount,
                    newRecord:      false,
                    userBoardPos:   -1,
                    newBpPos:       -1
                }
            };

            var osuFile = "./.osu/" + b + ".osu";
            if (!fs.existsSync(osuFile)) {
                await statusMsg.addText("Fetching beatmap " + ret.bmeta.beatmap + ".");
                let tryCount = 0; let success = false;

                while (tryCount <= 1) {
                    let data = await osu.fetchBeatmap(b, tryCount);
                    if (data.substr(0, 8) == 'osu file') {
                        fs.writeFileSync(osuFile, data);
                        success = true;
                        break;
                    } else {
                        await statusMsg.addText("Download retry count " + tryCount);
                        tryCount++;
                    }
                }

                if (!success) {
                    return statusMsg.edit("Download beatmap failed.");
                }
            }

            var bdata = await osu.osuParse(b);

            if (m < 2) {
                await statusMsg.addText("Calculating PP.");
                var oppai       = await osu.oppai({b: b, miss: userRecent.countmiss, 100: userRecent.count100, 50: userRecent.count50, cb: userRecent.maxcombo, m: m, mod: osu.parseOsuMod(userRecent.enabled_mods).join("")});
                var fc_oppai    = await osu.oppai({b: b, acc: osu.mode[m].acc(userRecent),                                                                      m: m, mod: osu.parseOsuMod(userRecent.enabled_mods).join("")});
                var ss_oppai    = await osu.oppai({b: b,                                                                                                        m: m, mod: osu.parseOsuMod(userRecent.enabled_mods).join("")});

                ret.score.pp    = base.round(oppai.pp);
                ret.score.pp_fc = base.round(fc_oppai.pp);
                ret.score.pp_ss = base.round(ss_oppai.pp);

                ret.score.pp_aim    = base.round(oppai.aim_pp);
                ret.score.pp_speed  = base.round(oppai.speed_pp);
                ret.score.pp_acc    = base.round(oppai.acc_pp);
            } else if (m == 3) {	// mania pp
                ret.score.pp    = base.round(await osu.mania_pp(bmap.difficultyrating, bdata, userRecent.enabled_mods, ret.score.score));
                ret.score.pp_fc = base.round(await osu.mania_pp(bmap.difficultyrating, bdata, userRecent.enabled_mods, 1000000 * 300 / 320));
                ret.score.pp_ss = base.round(await osu.mania_pp(bmap.difficultyrating, bdata, userRecent.enabled_mods));
            }

            if (userRecent.enabled_mods & (2 | 16 | 64 | 256)) {
                ret.bmeta.star.htotal   = true;
                ret.bmeta.diff.hCS      = userRecent.enabled_mods & (2 | 16);
                ret.bmeta.diff.hAR      = true;
                ret.bmeta.diff.hHP      = true;
                ret.bmeta.diff.hOD      = true;
            }

            if (userRecent.rank == "F" && m < 2) {
                ret.score.complete = base.round(osu.mode[m].score.map(a => {return userRecent[a]}).reduce((a, b) => a + b, 0) / (oppai.num_circles + oppai.num_sliders + oppai.num_spinners) * 100, 3) + "%";
            }

            if (userRecent.rank != "F") {	// pass
                var userRecord          = (await osu.getScores({u: u, b: b, m: m}))[0];  	// Best record on map

                var bp                  = await osu.getUserBest({u: u, m: m, limit: 100});  	// BP
                var newBpItem           = bp.filter(a => {a => a.beatmap_id == b && equalDate(a.date, userRecent.date)});
                if (newBpItem.length) {
                    ret.score.newBpPos  = bp.map(a => a.beatmap_id).indexOf(newBpItem[0].beatmap_id) + 1;
                }

                if (userRecord && equalDate(userRecord.date, userRecent.date)) {	// recent == best
                    ret.score._pp       = ret.score.pp;
                    ret.score.pp        = (userRecord.pp == 0 ? "(" + ret.score.pp + ")" : "__" + base.round(userRecord.pp) + "__");  	// loved pp = 0
                    ret.score.newRecord = true;

                    var scoreboard      = await osu.getScores({b: b, m: m, limit: 100}); // leaderboard
                    var scoreItem       = scoreboard.filter(a => {return a.score_id == userRecord.score_id});	// play makes him on board?
                    if (scoreItem.length)
                        ret.score.userBoardPos = scoreboard.map(a => a.score_id).indexOf(userRecord.score_id) + 1;
                }
            }

            if (userRecent.enabled_mods & (64 | 256)) {
                ret.bmeta.bpm       = hl(           base.round(ret.bmeta.bpm *      (userRecent.enabled_mods & 64 ? 1.5 : 0.75),            1));
                ret.bmeta.length    = hl(sec2str(   base.round(ret.bmeta.length *   (userRecent.enabled_mods & 64 ? 1 / 1.5 : 1 / 0.75),    0)));
            } else {
                ret.bmeta.length    = sec2str(ret.bmeta.length);
            }

            var embed = new MessageEmbed()
                .setColor(ret.mode.color)
                .setThumbnail("https://b.ppy.sh/thumb/" + ret.bmeta.sid + "l.jpg")
                .setTitle(ret.mode.text + " " + ret.bmeta.beatmap)
                .setURL("https://osu.ppy.sh/b/" + ret.bmeta.bid)
                .setTimestamp((() => {
                    var date = new Date(ret.time);
                    date.setHours(date.getHours() + 8);
                    return date.toISOString();
                })())
                .addField("Metadata", hl(ret.bmeta.star.total, ret.bmeta.star.htotal) + " " + osu.diffEmoji(ret.bmeta.star.total) + "\t" + ret.bmeta.bpm + " <:osuMetaBPM:546037644929269761>\t" + ret.bmeta.length + " <:osuMetaTL:546037644954435614>", true)
                .addField("Mods", ret.score.mod, true)
                .addField(ret.score.noteDesc, ret.score.note, true)
                .addField("Score", (ret.score.newRecord ? ":new: " : "") + (ret.score.userBoardPos != -1 ? hl("r#" + ret.score.userBoardPos) + "\t" : "") + (ret.score.newBpPos != -1 ? hl("BP#" + ret.score.newBpPos) + "\t" : "") + (ret.score.newRecord ? "__" : "") + ret.score.score.toLocaleString() + (ret.score.newRecord ? "__" : "") + osu.rankEmoji(ret.score.rank) + ret.score.acc, true)
                .addField("Combo", ret.score.combo + (ret.score.rank == "F" ? " (" + (ret.score.complete || "???") + " C)" : ""), true)
                .addField("Difficulty", (() => {
                    var o = [];
                    for (var i in ret.bmeta.diff) {
                        if (i.indexOf("h") == 0) continue;

                        if (m == 3) {
                            let key_count;
                            if (bdata.Mode != 3) { // converted map
                                let p = bdata.hitObjects.filter(a => a.endTime).length / bdata.hitObjects.length;	// percentSliderOrSpinner
                                let cs = Math.round(bdata.CircleSize);
                                let od = Math.round(bdata.OverallDifficlty);

                                if (p < 0.2) {
                                    key_count = 7;
                                } else if (p < 0.3 || cs >= 5) {
                                    key_count = od > 5 ? 7 : 6;
                                } else if (p > 0.6) {
                                    key_count = od > 4 ? 5 : 4;
                                } else {
                                    key_count = Math.max(4, Math.min(od + 1, 7));
                                }

                                key_count = "(" + key_count + ")";
                            } else {
                                key_count = ret.bmeta.diff.CS;
                            }

                            switch (i) {
                                case "AR":
                                    break;
                                case "CS":
                                    o.push(key_count + "K");
                                    break;
                                default:
                                    o.push(i + hl(ret.bmeta.diff[i], ret.bmeta.diff["h" + i]));
                                    break;
                            }
                        } else if (m == 1) {
                            switch (i) {
                                case "AR":
                                case "CS":
                                    break;
                                default:
                                    o.push(i + hl(ret.bmeta.diff[i], ret.bmeta.diff["h" + i]));
                                    break;
                            }

                        } else {
                            o.push(i + hl(ret.bmeta.diff[i], ret.bmeta.diff["h" + i]));
                        }
                    }
                    return o.join(" ");
                })(), true);

            if (base.isValid(ret.score.pp)) {
                embed.addField("PP",
                        ["🈶 " + ret.score.pp + "pp",
                         "🈴 " + ret.score.pp_fc + "PP",
                         "🈵 " + ret.score.pp_ss + hl("PP")
                     ].join("\n"), true);
                if (m < 2) {
                     embed.addField("Acc / Aim / Speed PP",
                     [ret.score.pp_acc, ret.score.pp_aim, ret.score.pp_speed].map(a => {fpp = ret.score._pp | ret.score.pp; return base.rod(a, fpp, 8) + " " + (a | 0) + " " + ((a / fpp * 100) | 0) + "%"}).join("\n"), true);
                 }
            }

            LocalStorage["osu_recent"][message.channel.id] = ret;
            return statusMsg.edit("Try #" + ret.score.retryCount, {embed});
        } catch (e) {
            await statusMsg.edit("Error occured. (" + e.message + ") Contact author " + base.author_tag);
            base.pm(message, "```\n" + JSON.stringify(ret, null, 4) + "\n```");
            throw e;
        }
    }
};
