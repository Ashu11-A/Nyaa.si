import { type Page } from 'puppeteer'
import { JobStatus } from '../type/job'
import { Client } from './Client'
import { EventEmitter } from 'events'

type JobEvents = {
  died: (jobId: string) => void
  started: (jobId: string) => void
  reserved: (jobId: string) => void
  listening: (jobId: string) => void
}

export class Job {
  static all = new Map<string, Job>()
  static emitter = new EventEmitter()
  static on<K extends keyof JobEvents>(event: K, listener: JobEvents[K]) {
    this.emitter.on(event, listener)
  }
  static emit<K extends keyof JobEvents>(event: K, ...args: Parameters<JobEvents[K]>) {
    this.emitter.emit(event, ...args)
  }
  
  public id!: string
  public page!: Page
  public status: JobStatus = JobStatus.Dead
  protected static requestQueue: ((job: Job) => void)[] = []

  async create () {
    const { page, pageId } = await Client.newPage()

    this.id = pageId
    this.page = page
    this.status = JobStatus.Listening

    Job.emit('started', this.id)
    Job.emit('listening', this.id)
    Job.all.set(pageId, this)
  }

  async finishedTask () {
    await this.page.goto('about:blank')
    this.status = JobStatus.Listening
    Job.emit('listening', this.id)
  }

  stop () {
    Client.session.clear(this.id)
    if (!this.page.isClosed()) this.page.close()
  }

  static requestJob (): Promise<Omit<Job, 'create'>> {
    return new Promise<Job>((resolve) => {
      const availableJob = Array.from(Job.all.values()).find((job) => job.status === JobStatus.Listening)

      if (availableJob) {
        availableJob.status = JobStatus.Reserved
        Job.emit('reserved', availableJob.id)
        return resolve(availableJob)
      }

      this.requestQueue.push(resolve)
    })
  }

  static setupQueueListener() {
    this.on('listening', (jobId) => {
      const job = Job.all.get(jobId)
      if (!job) return

      const nextRequest = Job.requestQueue.shift()
      if (nextRequest) {
        job.status = JobStatus.Reserved
        Job.emit('reserved', jobId)

        nextRequest(job)
      }
    })
  }
}

Job.setupQueueListener()