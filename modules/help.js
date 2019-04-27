const base = require("./_base.js");
const RichEmbed = require("discord.js").RichEmbed;

const help_msg = {
	"雜項": {
		"b!help": "你現在看到的是什麼？",
		"b!ping": "乒乓球會玩嗎？",
		"b!slap[s] target [tool]": "來互相傷害吧！",
		"b!stat": "只有怪人會想看統計資料。",
		"b!roll [limit]": "你想試試自己的歐氣嗎？",
		"b!cho[ice] [question] [choices...]": "Decide for you.",
		"b!mine [w] [h] [n]": "Generate minesweeper of w*h with n mines."
	},
	"Images": {
		"b!kon[achan] | b!yan[dere] [tags]": "找圖工具。Tags: [Konachan](http://konachan.com/tag) | [Yandere](https://yande.re/tag)",
		"b!neko [number]": "Girls holding number cards.",
		"b!nudity img_url | pixiv_url": "Detect nudity of an image.",
		"b!sauce [url]": "Find sauce for url. If not given it will find the last image."
	},
	"Gacha (PriConne)": {
		"b!gacha[j] info": "View ongoing gachas.",
		"b!gacha[j] chance [gacha_id]": "View chances for characters.",
		"b!gacha[j] [n]": "Commit gacha. (1 or 10)",
		"b!gacha[j] find [char_id]": "Gacha until char_id is found."
	},
	"Osu": {
		"b!link osu_id": "要搞下面的東西，當然要讓我知道你是誰啦！這不是常識嗎？",
		"b!s | b!std | b!standard [osu_id]": "STD資料",
		"b!t | b!tk | b!taiko [osu_id]": "太鼓資料",
		"b!c | b!ctb [osu_id]": "接水果資料",
		"b!m | b!mania [osu_id]": "Mania資料",
		"b!rs | b!rt | b!rc | b!rm [osu_id]": "最近都在玩什麼奇怪的東西？"
	}
}

var embed = new RichEmbed();

for (var k in help_msg) {
	embed.addField("**__" + k + "__**", "-".repeat(16));
	for (var l in help_msg[k]) {
		embed.addField(l, help_msg[k][l], );
	}
}

module.exports = {
    trigger: ["help"],
    event: "message",
    argv: null,
    action: function(trigger, message) {
        message.reply({embed});
    }
}
