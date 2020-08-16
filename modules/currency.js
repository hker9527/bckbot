const base = require("./_base.js");
const cred = require("../cred.js");

const CURRENCY = ["TWD", "HKD", "JPY", "USD"];
var data = base.arr2obj(CURRENCY, [...new Array(CURRENCY.length)].map(a => ({})));
var lastUpdate;

async function worker() {
    try {
        for (let i of CURRENCY) {
            for (let j of CURRENCY) {
                if (i == j) continue;
                let _data = await base.req2json("https://free.currconv.com/api/v7/convert?q=" + i + "_" + j + "," + j + "_" + i + "&compact=ultra&apiKey=" + cred.currency);
                data[i][j] = _data[i + "_" + j];
                data[j][i] = _data[j + "_" + i];
            }
        }

        lastUpdate = new Date();
    } catch (e) {
        console.log("```\nCurrency update failed, data=\n" + JSON.stringify(data, null, 4) + "\n```");
    }
}
module.exports = {
    trigger: CURRENCY.map(a => a.toLowerCase()),
    event: "message",
    init: worker,
    interval: {
        f: worker,
        t: 3600 * 1000
    },
    action: async function (trigger, message, LocalStorage) {
        let txt = base.extArgv(message, true);
        let argv = base.parseArgv(txt);

        // https://free.currconv.com/api/v7/convert?q=TWD_HKD,HKD_TWD&apiKey=438f3676cfe4e6bb4034&compact=ultra

        let amount = parseFloat(argv[0]);
        let convAmount = {};

        for (let i of CURRENCY) {
            if (trigger.toUpperCase() == i) continue;
            convAmount[i] = base.round(amount * data[trigger.toUpperCase()][i], 2);
        }

        return message.reply("`" + amount + "`" + trigger.toUpperCase() + " = " + Object.keys(convAmount).map(a => "`" + convAmount[a] + "`" + a).join(" = "));
    }
};
