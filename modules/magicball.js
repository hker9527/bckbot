const base = require("./_base.js");
const data = {
    "good": {
        e: "🟢",
        as: [
            "It is certain.", "It is decidedly so.", "Without a doubt.", "Yes - definitely.", "You may rely on it.", "As I see it, yes.", "Most likely.", "Outlook good.", "Yes.", "Signs point to yes."
        ]
    },
    "fair": {
        e: "🟡",
        as: [
            "Reply hazy, try again.", "Ask again later.", "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again."
        ]
    },
    "bad": {
        e: "🔴",
        as: [
            "Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Very doubtful."
        ]
    }
};

module.exports = {
    trigger: ["8ball", "ask"],
    event: "message",
    action: async function (trigger, message, LocalStorage) {
        let txt = base.extArgv(message, true);

        if (txt === "") {
            return message.reply("What's the question?");
        }

        let type = base.randArr(Object.keys(data));
        let answer = base.randArr(data[type].as);

        let msg = await message.channel.send("🤔\t...");
        setTimeout(() => {
            msg.edit(data[type].e + "\t" + answer)
        }, 1000);
    }
};
