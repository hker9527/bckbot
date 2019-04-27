const base = require("./_base.js");

module.exports = {
    trigger: ["ls"],
    event: "message",
    action: function(trigger, message) {
        switch (trigger) {
            case "b!ls":
                message.channel.send("https://media.giphy.com/media/xT0xeOT3oM057IDN5u/giphy.gif");
                break;
            default:
                break;
        }
    }
}
