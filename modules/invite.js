const base = require("./_base.js");

module.exports = {
    trigger: ["invite"],
    event: "message",
    argv: ["client.user.id"],
    action: async function (trigger, message, LocalStorage, id) {
        return message.reply("<https://discordapp.com/oauth2/authorize?&client_id=" + id + "&scope=bot&permissions=252992>");
    }
};
