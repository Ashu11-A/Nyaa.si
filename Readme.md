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
import { Client, Filters, RunTimes, Scraper } from 'nyaa.si-client'

// if you are programming in communjs use this around the code
// (async () => {
    // code
// })()

const client = new Client({
  runTime: RunTimes.Cheerio,
  /**
   * This will allow you to load 5 pages simultaneously
   */
  concurrentJobs: 5,

  /**
   * @default 3000
   */
  timeout: 3000
  // runTime: RunTimes.Puppeteer,
  // showNavigator: true,
})

client.on('listening', (job) => console.log(`Job: ${job.id} is available for new tasks`))
client.on('reserved', (job) => console.log(`Job: ${job.id} is processing a task`))

/**
 * You can use these functions to do the setup manually, other than the dynamic initialize:
 * 
 * client.setupCheerio()
 * await client.setupPuppeteer()
 */
await client.initialize()

const scraper = new Scraper({
  client,
  /**
   *  This carries additional information such as:
   *  description, submitter, information, files, comments
   *  
   *  But it results in 75 requests per page, so I don't recommend using it!
   *  @default false
  */
  loadAdditionalInfo: false, // true | { comments: true... },
  /**
   * How many pages will be loaded for web scraping, each page has 75 torrents
   * 
   * @default 1
   */
  pagesToLoad: 2,
})

/**
 * Scraping page 1 and 2
 */
const extract = await scraper.search('re: zero', {
  filter: {
    category: 'anime',
    filter: Filters.NoFilter
  },
  page: 1
})

console.log(extract.getData())
/*
{
  "type": "list",
  "metadata": {
    "hasPreviousPage": true,
    "hasNextPage": true,
    "current": 2,
    "total": 14,
    "timestamp": 1736376348958,
    "timeTaken": 109.094,
    "nextPageLink": "https://nyaa.si/?f=0&c=1_0&q=re%3A+zero&p=3",
    "nextPage": 3
  },
  "count": 150,
  "torrents": [
    {
      "id": 1917004,
      "hash": "9dc1ff3ab137795503c91fdaeadfead6d44530e2",
      "category": "Anime - English-translated",
      "name": "Re ZERO Starting Life in Another World...",
      "links": {
        "magnet": "magnet:?xt=urn:btih:...",
        "page": "/view/1917004",
        "torrent": "/download/1917004.torrent"
      },
      "size": "199.8 MiB",
      "timestamp": 1735741923,
      "stats": {
        "seeders": 22,
        "leechers": 4,
        "downloaded": 224
      },
      "details": {
        "type": "details",
        "submitter": {
          "name": "varyg1001",
          "url": "https://nyaa.si/user/varyg1001"
        },
        "information": "https://myanimelist.net/anime/54857",
        "files": [
          {
            "type": "file",
            "fileName": "Re.ZERO.Starting.Life.in.Another.World.S03E08.The.Person.Ill.Fall.for.Someday.1080p.BILI.WEB-DL.AAC2.0.H.264-VARYG.mkv ",
            "readableSize": "199.8 MiB",
            "sizeInBytes": 209505484.8
          }
        ]
      }
    },
    // more 149...
  ]
}
*/

// const details = await scraper.details('https://nyaa.si/view/1919038')
// console.log(details)

await extract.addNextPage() // Add page 3 to the current data
await extract.addNextPage(2) // Add pages 4 and 5

const extractOnly = await extract.getNextPage() // Returns only page 6
console.log(extractOnly)
```

</div>
