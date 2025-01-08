import { Client, Filters, RunTimes, Scraper } from '../src/index'
import { writeFile } from 'fs/promises'

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
  "id": 1886663,
  "hash": "39d9d66448f2c9deb415eeaf8cb82ccfd803c83b",
  "title": "[ASW] Re Zero kara Hajimeru Isekai Seikatsu - 53 [1080p HEVC x265 10Bit][AAC]",
  "category": "Anime - English-translated",
  "link": "https://nyaa.si/view/1886663",
  "torrent": "https://nyaa.si/download/1886663.torrent",
  "magnet": "magnet:?xt=urn:btih:...",
  "size": "281.5 MiB",
  "seeders": 77,
  "leechers": 1,
  "downloads": 5875,
  "timestamp": 1729092113,
  "details": {
    "type": "details",
    "description": "### Report issues on our [discord server](...",
    "submitter": {
      "name": "AkihitoSubsWeeklies",
      "url": "https://nyaa.si/user/AkihitoSubsWeeklies"
    },
    "information": "https://discord.gg/....",
    "files": [
      {
        "type": "file",
        "fileName": "[ASW] Re Zero kara Hajimeru Isekai Seikatsu - 53 [1080p HEVC][9F98648D].mkv ",
        "readableSize": "281.5 MiB",
        "sizeInBytes": 295174144
      }
    ],
    "comments": [
      {
        "avatarURL": "https://nyaa.si/static/img/avatar/default.png",
        "userName": "ZERO900",
        "message": "Thanks",
        "date": "2024-10-16 21:35:16",
        "timestamp": 1729125316,
        "isUploader": false
      }
    ]
  }
},
*/

const details = await scraper.details('https://nyaa.si/view/1919038')
console.log(details)

const nextPage = await extract.addNextPage() // Add page 3 to the current data
console.log(nextPage)

const nextMostPages = await extract.addNextPage(2) // Add pages 4 and 5
console.log(nextMostPages)

const extractOnly = await extract.getNextPage() // Returns only page 6
console.log(extractOnly)

// console.log(torrents.count)
await writeFile('data.json', JSON.stringify(extract.getData(), null, 2))
// await scraper.close()