# bckbot

> A discord bot powered by discord.js

## Functionalities

* Context menu support
* Reverse image search
* Better pixiv preview (Multi image support)
* Better embeds for Twitter, Facebook and Bilibili links
* Currency conversion
* Scam URL detection
* Utilities, e.g. choices, magicball
* i18n (Supported languages: English, Traditional Chinese. More coming!)

## Live demo

[Here](https://discordapp.com/oauth2/authorize?&client_id=342373857555906562&scope=bot%20applications.commands&permissions=523328)

## How to run

Check `.env.example` to find out what tokens are required. Then, just run

```bash
yarn
yarn start
```

## Main libraries

* discord.js
* TypeScript
* ESLint

## APIs

| Name | Purposes |
| ---- | -------- |
|[pixiv](https://www.pixiv.net/en/)|Fetch images from pixiv|
|[saucenao](https://saucenao.com/)|Reverse image search|
|[exchangerate.host](https://exchangerate.host/)|Currency conversion|
|[Google Safebrowsing](https://safebrowsing.google.com/)|Detect malicious URLs|
|[FXTwitter](https://github.com/FixTweet/FixTweet)|Generate embeds from Twitter links|
|[facebed](https://facebed.com/)|Generate embeds from Facebook links|
|[vxbilibili](https://www.vxbilibili.com/)|Generate embeds from Bilibili links|