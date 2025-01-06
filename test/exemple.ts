import { Client, Filters, Scraper } from '../src/index'

await new Client({
  showNavigator: true,
  concurrentJobs: 2 // This will allow you to load 2 pages simultaneously
}).initialize()

const scraper = new Scraper({ loadPages: 2 }) // in the initial request, this will make it load 2 pages at once

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

// console.log(torrents.count)
// await writeFile('data.json', JSON.stringify(torrents, null, 2))
// await scraper.close()