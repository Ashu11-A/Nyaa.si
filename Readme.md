<div align="center">

# Nyaa.si

![license-info](https://img.shields.io/github/license/Ashu11-A/Nyaa.si?style=for-the-badge&colorA=302D41&colorB=f9e2af&logoColor=f9e2af)
![stars-infoa](https://img.shields.io/github/stars/Ashu11-A/Nyaa.si?colorA=302D41&colorB=f9e2af&style=for-the-badge)

![Last-Comitt](https://img.shields.io/github/last-commit/Ashu11-A/Nyaa.si?style=for-the-badge&colorA=302D41&colorB=b4befe)
![Comitts Year](https://img.shields.io/github/commit-activity/y/Ashu11-A/Nyaa.si?style=for-the-badge&colorA=302D41&colorB=f9e2af&logoColor=f9e2af)
![reposize-info](https://img.shields.io/github/languages/code-size/Ashu11-A/Nyaa.si?style=for-the-badge&colorA=302D41&colorB=90dceb)

![SourceForge Languages](https://img.shields.io/github/languages/top/Ashu11-A/Nyaa.si?style=for-the-badge&colorA=302D41&colorB=90dceb)

</div>

<div align="left">

## 📃 | Description

Este projeto utiliza o Puppeteer para realizar web scraping no site de torrents de anime nyaa.si. Vale ressaltar que o projeto não possui nenhuma afiliação oficial com o nyaa.si, e seu uso é por sua conta e risco. O web scraping pode ser considerado ilegal dependendo de como é utilizado, portanto, é importante que tome cuidado. Evite práticas de pirataria, apoie os studios de anime de forma ética!

## 📥 | Installation

Installing this package is as easy as using it. Just run:

```sh
npm i nyaa.si
```

## ❓ | How to use

```ts
import { Client, Scraper, Filters } from 'nyaa.si'

// if you are programming in communjs use this around the code
// (async () => {
    // code
// })()

await new Client({
  showNavigator: true
}).initialize()
    
const scraper = new Scraper({
  concurrentJobs: 5,
  initialPageCount: 5
})

await scraper.search('Re: zero', {
  category: 'anime',
  filter: Filters.NoFilter
})

const torrents = await scraper.extract()
console.log (torrents) /*
{
  "type": "List",
  "metadata": {
    "hasPrevious": true,
    "hasNext": false,
    "currentPage": 1,
    "totalPages": 14,
    "timestamp": 1736096104456,
    "nextPageLink": "https://nyaa.si/?f=0&c=0_0&q=Re%3A+zero&p=2",
    "nextPage": 2
  },
  count: 75
  "data": [
    {
      "id": 1886644,
      "hash": "92526e454ea1e59a03e0bcaba652a1a625a042be",
      "title": "Re ZERO Starting Life in Another World S03E03 Gorgeous Tiger 1080p BILI WEB-DL AAC2.0 H 264-VARYG (Re:Zero kara Hajimeru Isekai Seikatsu 3rd Season, Multi-Subs)",
      "category": "Anime - English-translated",
      "link": "https://nyaa.si/view/1886644",
      "torrent": "https://nyaa.si/download/1886644.torrent",
      "magnet": "magnet:?xt=urn:...",
      "size": "305.7 MiB",
      "seeders": 6,
      "leechers": 1,
      "downloads": 447,
      "timestamp": 1729089567
    },
    ...more 74
}
*/

// If you forget to close the web scraper, you'll have memory leak problems
await scraper.close()
```

</div>
