const fs = require("fs");
const request = require("request-promise");
const sqlite = require("sqlite");
let math;
const res = {
    tw: {
        repo_url: "https://raw.githubusercontent.com/esterTion/tw_redive_master_db_diff/master/",
        gacha_url: "https://api2-pc.so-net.tw/provides_percent/gacha/"
    },
    jp: {
        repo_url: "https://raw.githubusercontent.com/esterTion/redive_master_db_diff/master/",
        //gacha_url: "https://app.priconne-redive.jp/provides_percent/gacha/"
        gacha_url: "http://bckpri.ddns.net/?gacha_id="
    }
};

const portal = {
    tv: "!TruthVersion.txt",
    gacha: "gacha_data.sql",
    id_name: "unit_profile.sql"
};

const starProb = [
    [0.795, 0.18, 0.025],
    [0, 0.975, 0.025]
];

function round(i, d = 2) {
    return Math.round(i * Math.pow(10, d)) / Math.pow(10, d);
}

async function _request(...argv) {
    return new Promise((res, rej) => {
        try {
            request(...argv).then(data => {
                res(data);
            });

            setTimeout(() => {
                rej()
            }, 1500);
        } catch (e) {
            rej();
        }
    })
}

dir = "./pc/";

async function main() {
    let _output = {};
    for (let v of Object.keys(res)) {
        let git_base = res[v].repo_url;
        let gacha_base = res[v].gacha_url;

        let output = {
            id: {},
            info: {},
            chance: {}
        };
        // check TruthVersion
        let tv = await request(git_base + portal.tv);

        try {
            let data = require("./" + v + ".json")
            let _tv = data.TV;
            if (tv == _tv && process.argv[2] != "-f") {
                console.log("TruthVersion not changed");
                continue;
            }
        } catch (e) {
            console.log("init file " + v);
        }

        // init db
        let gacha_data = await request(git_base + portal.gacha);
        let unit_data = await request(git_base + portal.id_name);

        let db = await sqlite.open(":memory:", {Promise});

        for (let i of [gacha_data, unit_data]) {
            for (let l of i.split("\n")) {
                if (l.length) await db.run(l);
            }
        }

        // fetch ongoing gacha
        let t = await db.all('select *, datetime(replace(start_time, "/", "-")) as s, datetime(replace(end_time, "/", "-")) as e, datetime("now", "localtime") as n from gacha_data where s < n and n < e and gacha_id > 20000');

        for (var _t of t) {
            let data = await request(gacha_base + _t.gacha_id);

            let chance = {19: {}, 10: {}};
            try {
                let [t19, t10] = data.match(/<table.*?<\/table>/g);
            } catch (e) {
                continue;
            }

            var _i = 0;

            for (let t of data.match(/<table.*?<\/table>/g)) {
                for (let a of t.match(/(<td.+?<\/td>){3}/g)) {
                    let [_, star, name, pc] = a.match(/(★{1,3}) (.+?)<.+?odds">(.+)%/);
                    let id = await db.all('select unit_id from unit_profile where unit_name = "' + name + '"');
                    id = parseInt(id[0].unit_id / 100);

                    output.id[id] = {
                        star: star.length,
                        name: name
                    };

                    let _p = parseFloat(pc).toString(); // sanitize trailing 0s
                    let _ps = (parseFloat(_p) / 100).toString(); // divide
                    let prec = 3;

                    chance[(_i == 0 ? "19" : "10")][id] = round(_ps.substr(0, _p.length + 2 + prec), 2 + prec);
                }

                /*
                let nCount = [0, 0, 0], prob = [0, 0, 0];
                Object.keys(chance[(_i == 0 ? "19" : "10")]).map(a => {
                    let _star = output.id[a].star - 1;
                    let _prob = chance[(_i == 0 ? "19" : "10")][a];

                    if (_prob == null) {
                        nCount[_star]++;
                    } else {
                        prob[_star] += _prob;
                    }
                });

                for (let i of Object.keys(chance[(_i == 0 ? "19" : "10")])) {
                    let _star = output.id[i].star - 1;
                    if (chance[(_i == 0 ? "19" : "10")][i] == null) {
                        chance[(_i == 0 ? "19" : "10")][i] = ((_t.gacha_id > 70000 && _i == 1 ? 1 : starProb[_i][_star]) - prob[_star]) / nCount[_star];
                    }
                }*/
                _i++;
            }

            for (let id of Object.keys(output.id)) {
                for (let _id of [id + "31", id + "11"]) {
                    if (!fs.existsSync(dir + "img/" + _id + ".png")) {
                        console.log("missing icon " + _id);
                    }
                }
            }

            output.info[_t.gacha_id] = {
                id: _t.gacha_id,
                name: _t.gacha_name,
                desc: _t.description,
                start: _t.s,
                end: _t.e
            };

            output.chance[_t.gacha_id] = chance;
        }
        _output[v] = output;
        fs.writeFileSync(dir + v + ".json", JSON.stringify({TV: tv, ...output}, null, 4));
    }
    return _output;
}

module.exports = function() {
    math = require("./_math.js");
    main();
};

if (require.main === module) {
    dir = "./";
    math = require("../modules/_math.js");
    main().then(process.exit);
}

//test()
