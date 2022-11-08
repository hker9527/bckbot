# bckbot

> A discord bot powered by discord.js

## Functionalities

* Context menu support
* Reverse image search
* Nudity detection
* Better pixiv preview (Multi image support)
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
|[deepai](https://deepai.org/machine-learning-model/nsfw-detector)|Nudity detection|
|[saucenao](https://saucenao.com/)|Reverse image search|
|[exchangerate.host](https://exchangerate.host/)|Currency conversion|
|[quotable.io](https://github.com/lukePeavey/quotable)|Get random quotes|
|[Google Safebrowsing](https://safebrowsing.google.com/)|Detect malicious URLs|