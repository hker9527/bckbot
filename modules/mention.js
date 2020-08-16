const base = require("./_base.js");
const chance = {
    "owo?": 0.5,
    "uwu?": 0.4,
    "b...baka!": 0.08,
    "O-oooooooooo AAAAE-A-A-I-A-U- JO-oooooooooooo AAE-O-A-A-U-U-A- E-eee-ee-eee AAAAE-A-E-I-E-A- JO-ooo-oo-oo-oo EEEEO-A-AAA-AAAA": 0.02
};

module.exports = {
    trigger: ["*mention"],
    event: "message",
    argv: ["client.user.id"],
    action: async function (trigger, message, LocalStorage, id) {
        if (message.mentions.users.has(id)) {
            return message.reply(base.urandom(chance));
        }
    }
};
