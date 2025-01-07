import type { Browser } from 'puppeteer'
import puppeteer from 'puppeteer'
import type { ClientOptions } from '../type/client'
import { Job } from './Job'
import { SessionManager } from './SessionManager'

export class Client {
  static host = 'https://nyaa.si'
  static browser: Browser
  static session = new SessionManager()
  public showNavigator: boolean = false
  public readonly concurrentJobs: number = 1
  public readonly timeout: number = 3000

  constructor(options?: ClientOptions) {
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
        async () => await new Job(this.timeout).create()
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