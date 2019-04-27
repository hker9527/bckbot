const base = require("./_base.js");
const osu = require("./_osu.js");
const error = require("./error.js");
const fs = require("fs");
const sqlite = require("sqlite");
const RichEmbed = require("discord.js").RichEmbed;

var db;
sqlite.open("osu.db", {Promise}).then(d => db = d).catch(e => {throw e;});

module.exports = {
    trigger: ["rs", "rt", "rc", "rm"],
    event: "message",
    argv: null,
    action: async function(trigger, message) {
        try {
            let txt = base.extArgv(message.content);
            let argv = base.parseArgv(txt);

            let m = osu.parseOsuMode(trigger.substr(3));

            let sql = "select * from users where chat_id = \'";

            let u;

            if (base.isValid(argv._[0])) { // specify user
                if (argv._[0].substr(0, 2) == "<@") { // mention
                    sql += argv._[0].match(/<@\!?(\d*)>/)[1];
                } else {
                    u = argv._.join(" ");
                }
            } else { // Not given, use himself
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

            var statusMsg = await message.channel.send("```\n" + base.timeFormat() + "\t" + "Process started.\n```");
            statusMsg.addText = async function (t) {
                return this.edit(this.content.substr(0, this.content.length - 4) + "\n" + base.timeFormat() + "\t" + t + "\n```");
            };

            const userInfo = (await osu.getUser({u: u}))[0];
            if (!userInfo) {
                return statusMsg.edit("Unknown user `" + u + "`.");
            }
            var userRecent = (await osu.getUserRecent({u: u, limit: 1, m: m}))[0];

            if (!userRecent) {
                return statusMsg.edit("No recent play found for user `" + userInfo.username + "`.");
            }

            var b = userRecent.beatmap_id;
            var retryCount = (await osu.getUserRecent({u: u, limit: 50, m: m})).filter(a => {return a.beatmap_id == b}).length;

            var bmap = (await osu.getBeatmaps({b: b, m: m, a: 1}))[0];  // Recent beatmap info

            var bp = await osu.getUserBest({u: u, m: m, limit: 100});   // BP
            var recentIsNewBP = !!bp.filter(a => {return a.beatmap_id == b && (+a.date == +userRecent.date)}).length;

            var userRecord = (await osu.getScores({u: u, b: b, m: m}))[0];   // Best record on map
            var scoreboard = await osu.getScores({b: b, m: m});
            var userBoardPos = scoreboard.map(a => {return a.username}).indexOf(u); // Name in board
            if (userBoardPos > -1 && (scoreboard[userBoardPos].date != userRecent.date)) {   // date check
                userBoardPos = -1;
            }

            var ret = {
                time: userRecent.date,
                pmeta: {
                    username: userInfo.username,
                    userid: userInfo.user_id
                },
                bmeta: {
                    bid: b,
                    sid: bmap.beatmapset_id,
                    beatmap: bmap.artist + " - " + bmap.title + " [" + bmap.version + "]",
                    star: base.round(bmap.difficultyrating, 2),
                    bpm: bmap.bpm,
                    diff: {
                        CS: bmap.diff_size,
                        AR: bmap.diff_approach,
                        HP: bmap.diff_drain,
                        OD: bmap.diff_overall
                    }
                },
                mode: {
                    mode: m,
                    text: osu.mode[m].text,
                    color: osu.mode[m].color
                },
                score: {
                    mod: osu.parseOsuMod(userRecent.enabled_mods).join(" "),
                    noteDesc: osu.mode[m].scoretext.join(" / "),
                    note: osu.mode[m].score.map(a => {return userRecent[a]}).join(" / "),
                    score: userRecent.score,
                    rank: userRecent.rank,
                    acc: base.round(osu.mode[m].acc(userRecent), 2) + "%",
                    combo: (userRecent.perfect == "1" ? "**" : "") + userRecent.maxcombo + "x / " + (bmap.max_combo === null ? "???" : bmap.max_combo) + "x" + (userRecent.perfect == "1" ? "**" : ""),
                    retryCount: retryCount,
                    newRecord: false,
                    userBoardPos: userBoardPos
                }
            }

            if (m < 2) {
                var osuFile = "./.osu/" + b + ".osu";
                if (!fs.existsSync(osuFile)) {
                    await statusMsg.addText("Fetching beatmap " + ret.bmeta.beatmap + ".");
                    let tryCount = 0; let success = false;

                    while (++tryCount < 3) {
                        let data = await osu.fetchBeatmap(b);
                        if (data.substr(0, 8) == 'osu file') {
                            fs.writeFileSync(osuFile, data);
                            success = true;
                            break;
                        } else {
                            await statusMsg.addText("Download retry count " + tryCount);
                        }
                    }

                    if (!success) {
                        return statusMsg.edit("Download beatmap failed.");
                    }
                }
                await statusMsg.addText("Calculating PP.");
                var oppai       = await osu.oppai({b: b, miss: userRecent.countmiss, 100: userRecent.count100, 50: userRecent.count50, cb: userRecent.maxcombo, m: m, mod: osu.parseOsuMod(userRecent.enabled_mods).join("")});
                var fc_oppai    = await osu.oppai({b: b, acc: osu.mode[m].acc(userRecent),                                                                      m: m, mod: osu.parseOsuMod(userRecent.enabled_mods).join("")});
                var ss_oppai    = await osu.oppai({b: b,                                                                                                        m: m, mod: osu.parseOsuMod(userRecent.enabled_mods).join("")});

                ret.score.pp = oppai.pp;
                ret.score.pp_fc = fc_oppai.pp;
                ret.score.pp_ss = ss_oppai.pp;

                ret.score.pp_aim = oppai.aim_pp;
                ret.score.pp_speed = oppai.speed_pp;
                ret.score.pp_acc = oppai.acc_pp;
                if (userRecent.enabled_mods & (2 | 16 | 64 | 256)) {
                    ret.bmeta.star = "**" + base.round(oppai.stars, 2) + "**";
                    ret.bmeta.diff = {
                        CS: (oppai.cs != ret.bmeta.diff.CS ? "**" + base.round(oppai.cs, 1) + "**" : ret.bmeta.diff.CS),
                        AR: (oppai.ar != ret.bmeta.diff.AR ? "**" + base.round(oppai.ar, 1) + "**" : ret.bmeta.diff.AR),
                        HP: (oppai.hp != ret.bmeta.diff.HP ? "**" + base.round(oppai.hp, 1) + "**" : ret.bmeta.diff.HP),
                        OD: (oppai.od != ret.bmeta.diff.OD ? "**" + base.round(oppai.od, 1) + "**" : ret.bmeta.diff.OD),
                    }
                }
            }
            if (userRecord && Object.keys(userRecord).length && userRecord.date == userRecent.date) { // recent == best
                ret.score._pp = ret.score.pp;
                ret.score.pp = "__" + base.round(userRecord.pp, 2) + "__";
                ret.score.newRecord = true;
            }
            if (userRecent.rank == "F" && m < 2) {
                ret.score.complete = base.round(osu.mode[m].score.map(a => {return userRecent[a]}).reduce((a, b) => a + b, 0) / (oppai.num_circles + oppai.num_sliders + oppai.num_spinners) * 100, 3) + "%";
            }
            if (ret.score.mod.indexOf("DT") > -1 || ret.score.mod.indexOf("HT") > -1) {
                ret.bmeta.bpm = "**" + base.round(ret.bmeta.bpm * (ret.score.mod.indexOf("DT") > -1 ? 1.5 : 0.75), 1) + "**";
            }

            var embed = new RichEmbed()
                .setColor(ret.mode.color)
                .setThumbnail("https://b.ppy.sh/thumb/" + ret.bmeta.sid + "l.jpg")
                .setTitle(ret.mode.text + " " + ret.bmeta.beatmap)
                .setURL("https://osu.ppy.sh/b/" + ret.bmeta.bid)
                .setTimestamp((() => {
                    var date = new Date(ret.time);
                    date.setHours(date.getHours() + 8);
                    return date.toISOString();
                })())
                .addField("Metadata", ret.bmeta.star + osu.diffEmoji(ret.bmeta.star) + "\t" + ret.bmeta.bpm + "<:osuMetaBPM:546037644929269761>", true) // <:osuMetaTL:546037644954435614>
                .addField("Mods", ret.score.mod, true)
                .addField(ret.score.noteDesc, ret.score.note, true)
                .addField("Score", (ret.score.newRecord ? ":new: " : "") + (ret.score.userBoardPos > -1 ? "__**r#" + ret.score.userBoardPos + "**__" : "") + ret.score.score.toLocaleString() + osu.rankEmoji(ret.score.rank) + ret.score.acc, true)
                .addField("Combo", ret.score.combo + (ret.score.rank == "F" ? " (" + ret.score.complete + " C)" : ""), true)
                .addField("Difficulty", (() => {
                    var o = "";
                    for (var i in ret.bmeta.diff) {
                        o += i + ret.bmeta.diff[i] + " ";
                    }
                    return o;
                })(), true);

            if (base.isValid(ret.score.pp)) {
                embed.addField("PP", ["🈶 " + (typeof ret.score.pp == "string" ? ret.score.pp : base.round(ret.score.pp, 2)) + "pp", "🈴 " + base.round(ret.score.pp_fc, 2) + "PP", "🈵 " + base.round(ret.score.pp_ss, 2) + "**PP**"].join("\n"), true)
                     .addField("Acc / Aim / Speed PP", [ret.score.pp_acc, ret.score.pp_aim, ret.score.pp_speed].map(a => {fpp = ret.score._pp | ret.score.pp; return base.rod(a, fpp, 8) + " " + (a | 0) + " " + ((a / fpp * 100) | 0) + "%"}).join("\n"), true);
            }


            return statusMsg.edit("Try #" + ret.score.retryCount, {embed});
        } catch (e) {
            await statusMsg.edit("Error occured. Contact author " + base.author_tag);
            base.pm(message, "```\n" + JSON.stringify(ret, null, 4) + "\n```");
            throw e;
        }
    }
}
