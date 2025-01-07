import { EventEmitter } from 'events'
import { type Page } from 'puppeteer'
import { JobStatus, type JobEvents } from '../type/job'
import { Client } from './Client'

export class Job {
  static all = new Map<string, Job>()
  static emitter = new EventEmitter()
  static on<K extends keyof JobEvents>(event: K, listener: JobEvents[K]) {
    this.emitter.on(event, listener)
  }
  static emit<K extends keyof JobEvents>(event: K, ...args: Parameters<JobEvents[K]>) {
    this.emitter.emit(event, ...args)
  }

  constructor(public readonly timeout: number) {}
  
  public id!: string
  public page!: Page
  public status: JobStatus = JobStatus.Dead
  protected static requestQueue: ((job: Job) => void)[] = []

  async create () {
    const { page, pageId } = await Client.newPage()

    this.id = pageId
    this.page = page
    this.status = JobStatus.Listening

    Job.emit('started', this)
    Job.emit('listening', this)
    Job.all.set(pageId, this)
  }

  async finishedTask () {
    await this.page.goto('about:blank')
    await new Promise<void>((resolve) => setTimeout(() => resolve(), this.timeout))
    this.status = JobStatus.Listening
    Job.emit('listening', this)
  }

  stop () {
    Client.session.clear(this.id)
    if (!this.page.isClosed()) this.page.close()
    Job.emit('died', this)
    Job.all.delete(this.id)
  }

  static requestJob (): Promise<Omit<Job, 'create'>> {
    return new Promise<Job>((resolve) => {
      const availableJob = Array.from(Job.all.values()).find((job) => job.status === JobStatus.Listening)

      if (availableJob) {
        availableJob.status = JobStatus.Reserved
        Job.emit('reserved', availableJob)
        return resolve(availableJob)
      }

      this.requestQueue.push(resolve)
    })
  }

  static setupQueueListener() {
    this.on('listening', (job) => {
      const nextRequest = Job.requestQueue.shift()
      if (nextRequest) {
        job.status = JobStatus.Reserved
        Job.emit('reserved', job)

        nextRequest(job as Job)
      }
    })
  }
}

Job.setupQueueListener()