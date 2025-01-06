import type { Browser } from 'puppeteer'
import puppeteer from 'puppeteer'
import { SessionManager } from './SessionManager'

type ClientConfig = {
  session?: SessionManager
  /**
   * Shows the browser and the actions being taken to perform webscraping
   * @default false
   */
  showNavigator?: boolean
}

export class Client {
  static host = 'https://nyaa.si'
  static browser: Browser
  static session = new SessionManager()
  public showNavigator: boolean = false

  constructor (options?: ClientConfig) {
    if (options?.session) Client.session = options.session
    if (options?.showNavigator) this.showNavigator = options.showNavigator
  }

  async initialize() {
    Client.browser = await puppeteer.launch({
      waitForInitialPage: true,
      acceptInsecureCerts: true,
      headless: !this.showNavigator
    })
  }

  static async newPage () {
    const context = await this.browser.createBrowserContext()
    const page = await context.newPage()

    const session = this.session.create((page.mainFrame() as unknown as { _id: string })._id)

    await page.setUserAgent(session)
    await page.setViewport({
      width: 1920,
      height: 1080
    })

    return page
  }
}