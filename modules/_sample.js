const base = require("./_base.js");

module.exports = {
    trigger: [""],
    event: "message",
    action: function(trigger, message, LocalStorage) {
        let txt = base.extArgv(message, true);
        let argv = base.parseArgv(txt);
    }
};
