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
|[pixiv.cat](https://pixiv.cat/)|Serve pixiv images past the `i.pximg.net` hotlink block|
|i.loli.best|Same, used as fallback when pixiv.cat is unreachable|
|[saucenao](https://saucenao.com/)|Reverse image search|
|[exchangerate.host](https://exchangerate.host/)|Currency conversion|
|[Google Safebrowsing](https://safebrowsing.google.com/)|Detect malicious URLs|
|[FXTwitter](https://github.com/FixTweet/FixTweet)|Generate embeds from Twitter links|
|[facebed](https://facebed.com/)|Generate embeds from Facebook links|
|[vxbilibili](https://www.vxbilibili.com/)|Generate embeds from Bilibili links|

### pixiv image proxies

`i.pximg.net` rejects hotlinked requests, so images are served through a reverse
proxy that re-sends them with a `pixiv.net` Referer. These are free third-party
services run by volunteers — please do not hammer them, and consider self-hosting
if you run a busy instance.

Set `pixiv_proxy_hosts` in `.env` to a comma-separated list; hosts are tried in
order, and one that fails is skipped for 5 minutes. Any proxy mirroring the
`i.pximg.net` path scheme works, so a self-hosted one can simply go first in the
list. These have been verified to work: `i.pixiv.cat`, `i.loli.best`,
`i.pixiv.nl`, `i.pixiv.re`.

Public proxies do disappear — `i.yuki.sh`, used until v3.6.1, stopped resolving
entirely. That is why the list is configurable.