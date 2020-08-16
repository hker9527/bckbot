const base = require("./_base.js");

module.exports = {
    trigger: ["ping"],
    event: "message",
    argv: ["client.ws.ping"],
    action: function (trigger, message, LocalStorage, ping) {
        return message.reply('pong :ping_pong: Ping: `' + base.round(ping, 2) + "` ms");
    }
};
