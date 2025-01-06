import { Client, Filters, Scraper } from '../src/index'
import { writeFile } from 'fs/promises'

await new Client({
  showNavigator: true
}).initialize()
    
const scraper = new Scraper({
  concurrentJobs: 5,
  initialPageCount: 5
})

console.time()

await scraper.search('Re: zero', {
  category: 'anime',
  filter: Filters.NoFilter
})

const torrents = await scraper.extract()
console.timeEnd()

console.log(torrents.count)
await writeFile('data.json', JSON.stringify(torrents, null, 2))
// await scraper.close()