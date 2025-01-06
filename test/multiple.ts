import { Client, Scraper } from '../src/index'

(async () => {
  await new Client({ showNavigator: true }).initialize()
    
  await Promise.all([
    (async () => {
      const scraper = new Scraper()
      await scraper.initialize()
      await scraper.search('Re: zero')
      console.log((await scraper.extract()).count)
      await scraper.close()
    })(),
    (async () => {
      const scraper = new Scraper()
      await scraper.initialize()
      await scraper.search('Konosuba')
      console.log((await scraper.extract()).count)
      await scraper.close()
    })()
  ])
})()