const base = require("./_base.js");

module.exports = {
    trigger: ["ss"],
    event: "message",
    action: async function (trigger, message, LocalStorage) {
        let vc = message.guild.members.find("id", message.author.id).voiceChannel;
        if (vc) {
            return message.reply("<https://discordapp.com/channels/" + message.guild.id + "/" + vc.id + "/>");
        } else {
            return message.reply("Join a voice channel!");
        }
    }
};
