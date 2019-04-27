const fs = require("fs")

const cd = __dirname + "/";

var cmd = {
    message: {},
    messageUpdate: {},
    messageDelete: {},
    mention: {}
};

function getModules(cb, base = false) {
    fs.readdir(cd, (e, f) => {
        if (e) throw e;
        var f = f.filter(a => {
            return a.split(".")[1] == "js" && (base ? a.substr(0, 1) != "_" : true) && a != "_index.js";
        })

        return cb(f);
    });
}

function checkPath(file) {
    if (file.indexOf("/") == -1) {
        return cd + file;
    } else {
        return file;
    }
}

function handle(file, _work, cb) {
    switch (typeof file) {
        case "string":
            _work(checkPath(file));
            break;
        case "object":
            for (let f of file) {
                _work(checkPath(f));
            }
            break;
        default:
            break;
    }
    cb(file);
}

function unload(file, cb = () => {}) {
    return handle(file, (i) => {
        return delete require.cache[require.resolve(i)];
    }, cb);
}

function load(file, cb = () => {}) {
    return handle(file, (i) => {
        tmp = require(i);
        for (var j in tmp.trigger) {
            cmd[tmp.event][tmp.trigger[j]] = {
                action: tmp.action,
                argv: tmp.argv
            };
        }
    }, cb);
}

function reload(file, cb = () => {}) {
    return handle(file, (i) => {
        unload(i);
        load(i);
    }, cb);
}


module.exports = {
    cmd,
    getModules,
    load,
    reload,
    unload
}
