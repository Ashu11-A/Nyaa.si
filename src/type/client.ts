import type { Browser } from 'puppeteer'
import type { SessionManager } from '../controllers/SessionManager'

export enum RunTimes {
  Puppeteer = 'puppeteer',
  Cheerio = 'cheerio'
}

export type BrowserInstance<RunTime extends RunTimes>= RunTime extends RunTimes.Puppeteer ? Browser : never 

export type ClientOptions<RunTime extends RunTimes>= {
    session?: SessionManager
    /**
     * Total number of pages to be processed in parallel
     * 
     * @default 1
    */
   concurrentJobs?: number
   /**
    * This limits the time for the next job request, I don't recommend decreasing this to less than 3000 ms
     * 
     * @default 3000
   */
  timeout?: number
  
  runTime?: RunTime
  /**
   * Shows the browser and the actions being taken to perform webscraping
   * 
   * @default false
   */
  showNavigator?: RunTime extends RunTimes.Puppeteer ? boolean : never
}