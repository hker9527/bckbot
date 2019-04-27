const base = require("./_base.js");

const num = "　１２３４５６７８９".split("");
const bomb = "Ｘ";

function r(l, h) {
    return (Math.random() * (h - l) + l) | 0;
}

module.exports = {
    trigger: ["mine"],
    event: "message",
    argv: null,
    action: function(trigger, message) {
        let txt = base.extArgv(message.cleanContent);
        let argv = base.parseArgv(txt);

        var [_h, _w, _n] = [argv._[0], argv._[1], argv._[2]];
        if (_h && _w && _h > 3 && _w > 3 && _h * _w < 200) {
            var [h, w] = [_h, _w];
        } else {
            var [h, w] = [base.random(5, 10), base.random(5, 10)]; // max: 200?
        }


        var mineArr = [...new Array(h)].map(a => [...new Array(w)].map(a => num[0]));
        var mineCount = _n && _n < (h * w - 3) ? _n : ((h * w / 10) | 0);

        var mines = [];
        var avail = [...new Array(h * w)].map((a, i) => i).filter(a => [0, w - 1, w * (h - 1) , w * h - 1].indexOf(a) == -1);

        for (let i = 0; i < mineCount; i++) {
            let ran = base.randArr(avail);

            mines.push(ran);
            delete avail[avail.indexOf(ran)];

            avail = avail.filter(a => !!a);
        }

        console.log(mines);
        for (let m of mines) {
            let [x, y] = [m % w, (m / w) | 0];
            mineArr[y][x] = bomb;
            for (let _m of [
                [x-1,   y-1],   [x-1,   y],   [x-1, y+1],
                [x,     y-1],   [x,     y],   [x,   y+1],
                [x+1,   y-1],   [x+1,   y],   [x+1, y+1]
            ].filter(a => a[0] < w && a[0] > -1 && a[1] < h && a[1] > -1)) {
                if (mineArr[_m[1]][_m[0]] != bomb) {
                    mineArr[_m[1]][_m[0]] = num[num.indexOf(mineArr[_m[1]][_m[0]]) + 1];
                }
            }
        }

        return message.channel.send(mineArr.map(a => a.map(b => "||" + b + "||").join("")).join("\n"));
    }
}
