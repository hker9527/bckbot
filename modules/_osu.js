const osuParser = require("osu-parser");
const base = require("./_base.js");
const error = {
    ERR_EMPTY_RESP: "Empty Response",
    ERR_ARGV: "Invalid Argument"
};
const BASE_URL = "https://osu.ppy.sh/api/";
const portals = {
    getBeatmaps: "get_beatmaps",
    getUser: "get_user",
    getUserBest: "get_user_best",
    getUserRecent: "get_user_recent",
    getScores: "get_scores"
};
const beatmap_mirrors = [
    "https://old.ppy.sh/osu/",
    "https://bloodcat.com/osu/b/"
];

const API_KEY = require("../cred.js").osu_api;
const exec = require('child_process').exec;

function formatter(o) {
    for (var i of Object.keys(o)) {
        switch (i) {
            case "date":
                o[i] = new Date(o[i]);
            case "file_md5":
            case "creator":
            case "artist":
            case "version":
            case "source":
            case "tags":
            case "username":
            case "join_date":
            case "title":
                continue;
            default:
                let tmp = parseFloat(o[i]);
                if (!isNaN(tmp)) {
                    o[i] = tmp;
                }
        }
    }
    return o;
}

async function _req(portal, argv) {
    try {
        var url = BASE_URL + portal + "?k=" + API_KEY + "&" + Object.keys(argv).map(a => {
            return a + "=" + argv[a]
        }).join("&");
        const resp = await base.req2json(url);
        //if (!resp.length) throw new Error(new Error())
        return resp.map(formatter);
    } catch (e) {
        throw new Error(error.ERR_EMPTY_RESP)
    }
}

function _oppai(argv) {
    if (typeof argv.b == "undefined") throw new Error(error.ERR_ARGV);

    return new Promise((res, rej) => {
        exec("oppai ./.osu/" + [
            argv.b + ".osu",
            (argv.mod ? "+" + argv.mod : ""),
            (argv.acc ? argv.acc + "%" : ""),
            (argv.miss ? argv.miss + "xm" : ""),
            (argv[100] ? argv[100] + "x100" : ""),
            (argv[50] ? argv[50] + "x50" : ""),
            (argv.m == 1 ? "-taiko" : ""),
            (argv.cb ? argv.cb + "x" : ""),
            "-ojson"
        ].filter(a => a.length).join(" "), (e, so, se) => {
            if (e) rej(e);
            res(so);
        })
    })
}

function _osuParse(id) {
    return new Promise((res, rej) => {
        osuParser.parseFile(base.DIR + ".osu/" + id + ".osu", (e, d) => {
            if (e) rej(e);
            res(d);
        });
    })
}

async function osuParse (id) {
    return await _osuParse(id);
}

var mod = ["NF", "EZ", "NV", "HD", "HR", "SD", "DT", "RX", "HT", "NC", "FL", "AT", "SO", "AP", "PF", "4K", "5K", "6K", "7K", "8K", "FI", "Random", 'Ci', "TP", "9K", "10K", "1K", "3K", "2K"];

function modEnum(s) {
    return Math.pow(2, mod.indexOf(s));
}

async function mania_pp(stars, bdata, mods = 0, score = 1000000) {
    const keyMods = [...new Array(9)].map((a, i) => modEnum((i + 1) + "K"));

    let object_count = bdata.hitObjects.length;

    if (bdata.Mode != 3) { // converted maps
        // https://github.com/ppy/osu/blob/master/osu.Game.Rulesets.Mania/Beatmaps/ManiaBeatmapConverter.cs#L40
        let p = bdata.hitObjects.filter(a => a.endTime).length / object_count; // percentSliderOrSpinner
        let cs = Math.round(parseFloat(bdata.CircleSize));
        let od = Math.round(parseFloat(bdata.OverallDifficlty));

        let key_count;
        if (p < 0.2) {
            key_count = 7;
        } else if (p < 0.3 || cs >= 5) {
            key_count = od > 5 ? 7 : 6;
        } else if (p > 0.6) {
            key_count = od > 4 ? 5 : 4;
        } else {
            key_count = Math.max(4, Math.min(od + 1, 7));
        }

        // https://osu.ppy.sh/help/wiki/Game_Modifiers#xk
        if (mods & 487555072) { // keyMods
            let mod_key_count = keyMods.filter(a => mods & a)[0] + 1;

            if (mod_key_count == key_count) score *= 1; // key mods
            else if (mod_key_count < key_count) score *= 0.9 - (key_count - mod_key_count) * 0.04;
        }
    }
    //if (mods & modEnum("HT")) score *= 1 / 0.5;

    let perfect_window = 64 - 3 * parseFloat(bdata.OverallDifficulty);
    let base_strain = Math.pow(5 * Math.max(1, stars / 0.2) - 4, 2.2) / 135;
    base_strain *= 1 + 0.1 * Math.min(1, object_count / 1500);
    base_strain *= (score < 500000 ? 0 :
                    (score < 600000 ? (score - 500000) / 100000 * 0.3 :
                     (score < 700000 ? (score - 600000) / 100000 * 0.25 + 0.3 :
                      (score < 800000 ? (score - 700000) / 100000 * 0.2 + 0.55 :
                       (score < 900000 ? (score - 800000) / 100000 * 0.15 + 0.75 :
                        ((score - 900000) / 100000 * 0.1 + 0.9))))));
    let window_factor = Math.max(0, 0.2 - (perfect_window - 34) * 0.006667);
    let score_factor = Math.pow(Math.max(0, (score - 960000)) / 40000, 1.1);
    let base_acc = window_factor * base_strain * score_factor;
    let acc_factor = Math.pow(base_acc, 1.1);
    let strain_factor = Math.pow(base_strain, 1.1);
    let final_pp = Math.pow(acc_factor + strain_factor, 1 / 1.1);

    final_pp *= 0.8;

    if (mods & modEnum("EZ")) {
        final_pp *= 0.5;
    }

    if (mods & modEnum("NF")) {
        final_pp *= 0.9;
    }

    return final_pp;
}

module.exports = {
    error: error,
    diffEmoji: function (diff) {
        diff = parseFloat(diff.toString().replace(/\*/g, ""));

        if (diff > 6.5) {
            return "<:osuDiffEP:545909651703595043>"
        } else if (diff > 5.3) {
            return "<:osuDiffEX:545909651506462720>"
        } else if (diff > 4) {
            return "<:osuDiffIN:545909651573571594>"
        } else if (diff > 2.7) {
            return "<:osuDiffHD:545909651540017152>"
        } else if (diff > 2) {
            return "<:osuDiffNM:545909651342884877>"
        } else {
            return "<:osuDiffEZ:545909651414319115>"
        }
    },
    rankEmoji: function (rank) {
        switch (rank) {
            case "XH":
                return "<:osuRankXH:545909540026318848>";
            case "SH":
                return "<:osuRankSH:545909540047028244>";
            case "X":
                return "<:osuRankX:545909539866804247>";
            case "S":
                return "<:osuRankS:545909540067999764>";
            case "A":
                return "<:osuRankA:545909540038901771>";
            case "B":
                return "<:osuRankB:545909540223451136>";
            case "C":
                return "<:osuRankC:545909540114268160>";
            case "D":
                return "<:osuRankD:545909539883712542>";
            default:
                return "<:osuRankF:546039653837307904>";
        }
    },
    modeTrigger: {
        "s": 0,
        "std": 0,
        "standard": 0,
        "t": 1,
        "tk": 1,
        "taiko": 1,
        "c": 2,
        "ctb": 2,
        "m": 3,
        "mania": 3
    },
    modEnum: modEnum,
    mod: mod,
    mode: [
        {
            full: "Standard",
            icon: "https://i.ppy.sh/f8b581f28db6b637343cdb6f351653b120dee167/68747470733a2f2f6f73752e7070792e73682f68656c702f77696b692f7368617265642f6d6f64652f6f73752e706e67",
            scoretext: ["300", "100", "50", ":x:"],
            score: ["count300", "count100", "count50", "countmiss"],
            text: "[STD]",
            color: 0xFF66AA,
            acc: (argv) => {
                return (argv.count50 * 50 + argv.count100 * 100 + argv.count300 * 300) / (argv.countmiss + argv.count50 + argv.count100 + argv.count300) / 3;
            }
        },
        {
            full: "太鼓",
            icon: "https://i.ppy.sh/996a535f73b2d6eb62aa707984fb25a4685ee5b0/68747470733a2f2f6f73752e7070792e73682f68656c702f77696b692f7368617265642f6d6f64652f7461696b6f2e706e67",
            scoretext: ["良", "可", "不可"],
            score: ["count300", "count100", "countmiss"],
            text: "[Taiko :drum:]",
            get color() {
                var ca = [0x488FAD, 0xEA4525];
                return base.randArr(ca);
            },
            acc: (argv) => {
                return (argv.count100 * .5 + argv.count300) / (argv.countmiss + argv.count100 + argv.count300) * 100;
            }
        },
        {
            full: "接水果",
            icon: "https://i.ppy.sh/faf037998e655ae49f63d048793bde88d6e190aa/68747470733a2f2f6f73752e7070792e73682f68656c702f77696b692f7368617265642f6d6f64652f63617463682e706e67",
            scoretext: ["300", "100", "50", ":x:"],
            score: ["count300", "count100", "count50", "countmiss"],
            get text() {
                var icons = [":green_apple:", ":apple:", ":pear:", ":tomato:", ":eggplant:", ":tangerine:", ":lemon:", ":banana:", ":watermelon:", ":grapes:", ":strawberry:", ":melon:", ":cherries:", ":peach:", ":pineapple:"];
                return "[CTB " + base.randArr(icons) + "]"
            },
            get color() {
                var ca = [0x388F68, 0xFC9B10, 0xF07336];
                return base.randArr(ca);
            },
            acc: (argv) => {
                return (argv.count50 + argv.count100 + argv.count300) / (argv.countkatu + argv.count50 + argv.count100 + argv.countmiss + argv.count300) * 100;
            }
        },
        {
            full: "Mania",
            icon: "https://i.ppy.sh/bf55b75bd40964972041d66bb0d741a779293279/68747470733a2f2f6f73752e7070792e73682f68656c702f77696b692f7368617265642f6d6f64652f6d616e69612e706e67",
            scoretext: ["320", "300", "200", "100", "50", ":x:"],
            score: ["countgeki", "count300", "countkatu", "count100", "count50", "countmiss"],
            text: "[Mania :musical_keyboard:]",
            get color() {
                var ca = [0xECCD00, 0xD8BED7, 0xCC6688];
                return base.randArr(ca);
            },
            acc: (argv) => {
                return (argv.count50 * 50 + argv.count100 * 100 + argv.count300 * 300 + argv.countgeki * 300 + argv.countkatu * 200) / (argv.countmiss + argv.count50 + argv.count100 + argv.count300 + argv.countkatu + argv.countgeki) / 3;
            }
        }
    ],
    parseOsuMode: function(s) {
        return this.modeTrigger[s];
    },
    parseOsuMod: function(m) {
        if (m == 0) return ["None"];
        var o = [];

        for (var i in this.mod) {
            if (m & Math.pow(2, i)) {
                o.push(this.mod[i]);
            }
        }
        if (o.includes("NC")) {
            return o.filter(a => {
                return a != "DT"
            });
        }

        return o;
    },
    getBeatmaps: async (argv) => {
        if (typeof argv.s == "undefined" && typeof argv.b == "undefined") throw new Error(error.ERR_ARGV);
        return await _req(portals.getBeatmaps, argv);
    },
    getUser: async (argv) => {
        if (typeof argv.u == "undefined") throw new Error(error.ERR_ARGV);
        return await _req(portals.getUser, argv);
    },
    getUserBest: async (argv) => {
        if (typeof argv.u == "undefined") throw new Error(error.ERR_ARGV);
        argv.limit = argv.limit || 100;
        return await _req(portals.getUserBest, argv);
    },
    getUserRecent: async (argv) => {
        if (typeof argv.u == "undefined") throw new Error(error.ERR_ARGV);
        return await _req(portals.getUserRecent, argv);
    },
    getScores: async (argv) => {
        if (typeof argv.b == "undefined") throw new Error(error.ERR_ARGV);
        return await _req(portals.getScores, argv);
    },
    fetchBeatmap: async (b, i = 0) => {
        return await base._req(beatmap_mirrors[i] + b);
    },
    oppai: async (argv) => {
        return JSON.parse(await _oppai(argv));
    },
    osuParse: osuParse,
    mania_pp: mania_pp
};
