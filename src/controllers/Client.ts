import axios from 'axios'
import { nanoid } from 'nanoid'
import puppeteer from 'puppeteer'
import { RunTimes, type BrowserInstance, type ClientOptions } from '../type/client'
import { JobStatus, type JobEvents, type RunTimeAPI } from '../type/job'
import { TypedEventEmitter } from './Emitter'
import { Job } from './Job'
import { SessionManager } from './SessionManager'

export class Client<const in out RunTime extends RunTimes = RunTimes.Cheerio>{
  static session = new SessionManager()
  public readonly runTime: RunTime = RunTimes.Cheerio as RunTime
  public browser!: BrowserInstance<RunTime>
  public readonly jobs = new Map<string, Job<RunTime>>()
  public readonly timeout: number = 3000
  public readonly showNavigator: boolean = false
  public readonly concurrentJobs: number = 1
  public readonly requestQueue: ((job: Job<RunTime>) => void)[] = []
  
  private host = 'https://nyaa.si'
  private readonly emitter = new TypedEventEmitter<JobEvents<RunTime>>()

  on<K extends keyof JobEvents<RunTime>>(event: K, listener: (...args: JobEvents<RunTime>[K]) => void) {
    this.emitter.on(event, listener)
  }
  emit<K extends keyof JobEvents<RunTime>>(event: K, ...args: JobEvents<RunTime>[K]) {
    this.emitter.emit(event, ...args)
  }

  constructor(options?: ClientOptions<RunTime>) {
    if (options?.session) Client.session = options.session
    if (options?.showNavigator) this.showNavigator = options.showNavigator
    if (options?.concurrentJobs) this.concurrentJobs = options.concurrentJobs
    if (options?.runTime) this.runTime = options.runTime

    this.setupQueueListener()
  }

  async initialize() {
    switch (this.runTime) {
    case (RunTimes.Cheerio): {
      this.setupCheerio()
      break
    }
    case (RunTimes.Puppeteer): {
      await this.setupPuppeteer()
    }
    }
  }

  async setupPuppeteer() {
    this.browser = await puppeteer.launch({
      waitForInitialPage: true,
      acceptInsecureCerts: true,
      headless: !this.showNavigator
    }) as BrowserInstance<RunTime>

    await Promise.all(
      Array.from(
        { length: this.concurrentJobs },
        async () => {
          const { page, pageId } = await this.newPage()
          new Job<RunTime>({
            id: pageId,
            api: page as RunTimeAPI<RunTime>,
            runTime: this.runTime,
            timeout: this.timeout,
            client: this,
          })
        }
      )
    )

    return this
  }

  setupCheerio() {
    for (let index = 0; index < this.concurrentJobs; index++) {
      const { instance, instanceId } = this.newAxiosInstance()

      const job = new Job<RunTime>({
        id: instanceId,
        api: instance as RunTimeAPI<RunTime>,
        runTime: this.runTime,
        timeout: this.timeout,
        client: this,
      })

      this.jobs.set(job.id, job)
    }

    return this
  }

  public set setURL (url: string) {
    this.host = url
  }
  public getURL (): string {
    return this.host
  }

  public newAxiosInstance() {
    const id = nanoid()
    const session = Client.session.create(id)

    const instance = axios.create({
      baseURL: this.host,
      headers: {
        'User-Agent': session
      },
      method: 'GET'
    })

    return { instance, instanceId: id }
  }

  public async newPage() {
    const context = await this.browser.createBrowserContext()
    const page = await context.newPage()
    const pageId = (page.mainFrame() as unknown as { _id: string })._id
    const session = Client.session.create(pageId)

    await page.setUserAgent(session)
    await page.setViewport({
      width: 1920,
      height: 1080
    })

    return { page, pageId }
  }

  requestJob(): Promise<Job<RunTime>> {
    return new Promise<Job<RunTime>>((resolve) => {
      const availableJob = Array.from(this.jobs.values())
        .find((job) => job.status === JobStatus.Listening)
  
      if (availableJob) {
        availableJob.status = JobStatus.Reserved
        this.emit('reserved', availableJob)
        return resolve(availableJob)
      }
  
      this.requestQueue.push(resolve)
    })
  }

  private setupQueueListener() {
    this.on('listening', (job) => {
      const nextRequest = this.requestQueue.shift()
  
      if (nextRequest) {
        job.status = JobStatus.Reserved
        this.emit('reserved', job)

        nextRequest(job as Job<RunTime>)
      }
    })
  }
}