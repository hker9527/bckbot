const base = require("./_base.js");
const request = require("request-promise");
const fs = require("fs");

module.exports = {
    trigger: ["*prefetch"],
    event: "message",
    argv: ['process.argv[2] == "dev"'],
    action: async function (trigger, message, LocalStorage, isDev) {
        if (!isDev && message.attachments.array().length && !message.author.bot) {
            for (let i of message.attachments.array()) {
                request({
                    uri: i.url,
                    method: "HEAD"
                }).catch(function (err) { // Handle errors
                    base.report("Error on prefetching " + i.filename + "\t[" + base.round(i.filesize / 1024, 3) + "KB]");
                });
            }
        }
    }
};
