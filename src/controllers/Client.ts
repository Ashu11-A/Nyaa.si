import type { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer'
import { SessionManager } from './SessionManager'
import { Job } from './Job'

type ClientConfig = {
  session?: SessionManager
  /**
   * Shows the browser and the actions being taken to perform webscraping
   * @default false
   */
  showNavigator?: boolean
  /**
   * Total number of pages to be processed in parallel
   * 
   * @default 1
   */
  concurrentJobs?: number
}

export class Client {
  static host = 'https://nyaa.si'
  static browser: Browser
  static session = new SessionManager()
  private concurrentJobs: number = 1
  public showNavigator: boolean = false

  constructor(options?: ClientConfig) {
    if (options?.session) Client.session = options.session
    if (options?.showNavigator) this.showNavigator = options.showNavigator
    if (options?.concurrentJobs) this.concurrentJobs = options.concurrentJobs
  }

  async initialize() {
    Client.browser = await puppeteer.launch({
      waitForInitialPage: true,
      acceptInsecureCerts: true,
      headless: !this.showNavigator
    })

    await Promise.all(
      Array.from(
        { length: this.concurrentJobs },
        async () => await new Job().create()
      )
    )
  }

  static async newPage() {
    const context = await this.browser.createBrowserContext()
    const page = await context.newPage()
    const pageId = (page.mainFrame() as unknown as { _id: string })._id
    const session = this.session.create(pageId)

    await page.setUserAgent(session)
    await page.setViewport({
      width: 1920,
      height: 1080
    })

    return { page, pageId }
  }
}