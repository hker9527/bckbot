const base = require("./_base.js");

module.exports = {
    trigger: ["ping"],
    event: "message",
    argv: ["client.ping"],
    action: function(trigger, message, ping) {
        return message.reply('pong :ping_pong: Ping: `' + base.round(ping, 2) + "` ms");
    }
}
