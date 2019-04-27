const base = require("./_base.js");

module.exports = {
    trigger: [""],
    event: "message",
    argv: null,
    action: function(trigger, message) {
        let txt = base.extArgv(message.cleanContent);
        let argv = base.parseArgv(txt);
    }
}
