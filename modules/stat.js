const base = require("./_base.js");
const request = require("request-promise");
const RichEmbed = require("discord.js").RichEmbed;
const os = require("os");

module.exports = {
    trigger: ["stat"],
    event: "message",
    argv: ["client.pings", "client.ping", "CredInfo.osu_api"],
    action: async function(trigger, message, p, _p, k) {
        var embed = new RichEmbed()
            .setColor(3447003)
            .setAuthor("Server Statistics")
            .addField("CPU Load", os.loadavg().map(function(d) {
                return (d / os.cpus().length * 100).toFixed(2) + "%";
            }).toString());


        request.get({url: "https://osu.ppy.sh/api/get_user?u=Cookiezi&k=" + k, time: true}, (e, r) => {
            embed.addField("Ping to Discord server", "min/avg/max " + Math.min.apply(null, p) + "ms/" + base.round(_p, 2) + "ms/" + Math.max.apply(null, p) + "ms");
            embed.addField("Responce time from Osu! API", r.elapsedTime + "ms");
            message.channel.send({
                embed
            })
        })
    }
}
