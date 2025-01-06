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

This project uses Puppeteer to perform web scraping on the anime torrent site **nyaa.si**. It is important to note that this project has no official affiliation with **nyaa.si**, and its use is entirely at your own risk. Keep in mind that web scraping can be considered illegal depending on the context and how it is applied. We recommend caution and a commitment to avoiding piracy practices. Support anime studios ethically!

## 📥 | Installation

Installing this package is as easy as using it. Just run:

```sh
npm i nyaa.si-client
```

## ❓ | How to use

```ts
import { Client, Scraper, Filters } from 'nyaa.si-client'

// if you are programming in communjs use this around the code
// (async () => {
    // code
// })()

await new Client({
  showNavigator: true,
  concurrentJobs: 2
}).initialize()

const scraper = new Scraper({ loadPages: 2 }) // This will allow you to load 2 pages simultaneously

const extract = await scraper.search('re: zero', {
  filter: {
    category: 'anime',
    filter: Filters.NoFilter
  },
  page: 5
}) // Scraping page 5 and 6

console.log(extract.getData())
/*
{
  "type": "List",
  "metadata": {
    "hasPreviousPage": true,
    "hasNextPage": true,
    "current": 5,
    "total": 14,
    "timestamp": 1736121700159,
    "nextPageLink": "https://nyaa.si/?f=0&c=1_0&q=Re%3A+zero&p=6",
    "nextPage": 6
  },
  count: 150
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
    ...more 149
}
*/

const nextPage = await extract.addNextPage() // Add page 7 to the current data
console.log(nextPage)

const nextMostPages = await extract.addNextPage(2) // Add pages 8 and 9
console.log(nextMostPages)

const extractOnly = await extract.getNextPage() // Returns only page 10
console.log(extractOnly)
```

</div>
