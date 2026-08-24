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
|[i.loli.best](https://github.com/Tsuk1ko/pximg-proxy)|Same, used as fallback when pixiv.cat is unreachable|
|[saucenao](https://saucenao.com/)|Reverse image search|
|[exchangerate.host](https://exchangerate.host/)|Currency conversion|
|[Google Safebrowsing](https://safebrowsing.google.com/)|Detect malicious URLs|
|[FXTwitter](https://github.com/FixTweet/FixTweet)|Generate embeds from Twitter links|
|[facebed](https://facebed.com/)|Generate embeds from Facebook links|
|[vxbilibili](https://www.vxbilibili.com/)|Generate embeds from Bilibili links|

### pixiv image proxies

`i.pximg.net` rejects hotlinked requests, so images are served through a reverse
proxy that re-sends them with a `pixiv.net` Referer. Thanks to the people running
these for free:

* **[pixiv.cat](https://pixiv.cat/)** — source at
  [pixiv-cat/pixivcat-backend](https://github.com/pixiv-cat/pixivcat-backend)
  (Node.js + Express, Memcached, MIT).
* **[i.loli.best](https://github.com/Tsuk1ko/pximg-proxy)** — the public demo
  instance of [Tsuk1ko/pximg-proxy](https://github.com/Tsuk1ko/pximg-proxy)
  (TypeScript + Hono, runs on Node.js ≥18 or Bun, Dockerfile included, MIT).

Please do not hammer them. `i.loli.best` is explicitly a demo instance, not a
service with an uptime promise, so anything busy should self-host. Both projects
ship a deployable server; `pximg-proxy` also runs serverless, but note it needs
pixiv credentials of its own (a `PHPSESSID` cookie or a client refresh token).

Set `pixiv_proxy_hosts` in `.env` to a comma-separated list; hosts are tried in
order, and one that fails is skipped for 5 minutes. Any proxy mirroring the
`i.pximg.net` path scheme works, so a self-hosted instance can simply go first in
the list. Verified working: `i.pixiv.cat`, `i.loli.best`, `i.pixiv.nl`,
`i.pixiv.re`.

Pick hosts from *different operators*. pixiv.cat's own site lists `pixiv.re` and
`pixiv.nl` as its backup mirror domains, so `i.pixiv.cat`, `i.pixiv.re` and
`i.pixiv.nl` share one backend and tend to fail together — the shipped default
pairs `i.pixiv.cat` with `i.loli.best` precisely because those two are
independent.

Public proxies do disappear — `i.yuki.sh`, used until v3.6.1, stopped resolving
entirely. That is why the list is configurable.