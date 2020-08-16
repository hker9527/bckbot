const vorpal = require('vorpal')();
const request = require("request-promise");
const fs = require("fs");
const math = require("./_math.js");
const CredInfo = require("../cred.js");

function timeFormat() {
    return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

function round(i, d = 2) {
    return parseFloat(
        String(Math.round(i * Math.pow(10, d)) / Math.pow(10, d))
            .substr(0, String(i | 0).length + 1 + d)
    );
}

function report(msg) {
    var txt = timeFormat();
    txt = txt + "\t" + msg;
    vorpal.log(txt);
    return true;
}

function quit() {
    report("Bot closed.");
    process.exit();
}

function isValid(a) {
    return !(typeof a == "undefined");
}

module.exports = {
    DIR: __dirname.split("/").slice(0, -1).join("/") + "/", // absolute path of bot
    author_tag: "<@" + CredInfo.author_id + ">",
    timeFormat,
	round,
	report,
	quit,
	isValid,

	random: function(low, high) {
	    if (low == high) return low;
	    return Math.floor(Math.random() * (high - low + 1) + low);
	},

	arr2obj: function(a1, a2) {
	    if (a1.length != a2.length) return null;
	    return Object.assign(...a1.map((v, i) => ({
	        [v]: a2[i]
	    })));
	},

	urandom: function (o) {
	    var t = 0;

	    var opt = Object.keys(o);

	    if (opt.length == 1) {
	        return opt[0];
	    } else {
	        var rand = Math.random();
	        let sprob = Object.values(o).reduce((a, b) => math.a(a, b), 0);
            //console.log(math.a(sprob, o[opt[opt.length - 1]]));
            if (round(sprob) != 1) {
                throw new Error("sprob != 1, got " + sprob);
            }
            sprob -= o[opt[opt.length - 1]];

	        for (var i = opt.length - 1; i > 0; i--) {
	            if (rand > sprob) {
	                return opt[i];
	            } else {
	                sprob = math.s(sprob, o[opt[i - 1]]);
	            }
	        }

	        return opt.shift();
	    }
	},

	genRand: function(l) {
	    var o = "";
	    for (var i = 0; i < Math.ceil(l / 8); i++) {
	        o = o + Math.random().toString(36).substr(2, 8);
	    }
	    return o.substr(0, l);
	},

    randArr: function (a) {
        return a.length == 1 ? a[0] : a[this.random(0, a.length - 1)];
    },

    parseArgv: function(t, d = " ") {
        a = t.split(d).filter((a) => {return a.length});
        return a;
    },

    extArgv: function (_t, clean = false) {
        let t = clean ? _t.cleanContent : _t.content;
        return t.split(" ").slice(1).join(" ");
    },

    _req: async function a(url, json = false) {
    	if (url == null) {
    		return null;
    	}

        const options = {
            method: "GET",
            uri: url,
            json: json,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36'
            }
        };

    	return request(options);
    },

    req2json: async function (url) {
    	return this._req(url, true);
    },

    pm: async function (_msg, txt) {
        return (await _msg.client.channels.fetch(CredInfo.error_chid)).send(txt);
    },

    pmError: async function (_msg, e) {
        return this.pm(_msg,
            [
                "Error from:\t`" + (_msg.guild ? _msg.guild.name : "(PM)") + " => " + _msg.channel.name + "`",
                "Original message:\t`" + _msg.content + "`",
                "Error stack: ",
                "```",
                e.stack
            ].join("\n").substr(0, 1997) + "```");
    },

    rod: function (v, m = 100, l = 10) {
    	let pv = math.d(m, l);
        return ("█".repeat(v <= 0 ? 0 : math.d(v, pv) | 0) +
                "▓".repeat(v <= 0 ? 0 : math.d(l - (m - v), pv) % 1 >= 0.5 ? 1 : 0) +
                "▒".repeat(v <= 0 ? 0 : math.d(l - (m - v), pv) % 1 < 0.5 ? 1 : 0) +
                "░".repeat(v <= 0 ? l : math.a(math.d(m - v, pv), 0.5) | 0)
    	).substr(0, l);
    }
};
