import { Page } from 'puppeteer'
import { RunTimes } from '../type/client'
import { JobStatus, type JobProps, type RunTimeAPI } from '../type/job'
import { Client } from './Client'


export class Job<RunTime extends RunTimes> {  
  public id!: string
  public status: JobStatus = JobStatus.Dead
  public readonly timeout: number
  public readonly runTime: RunTime
  public api!: RunTimeAPI<RunTime>
  public client: Client<RunTime>

  constructor({ runTime, timeout, client, api, id }: JobProps<RunTime> ) {
    this.runTime = runTime
    this.timeout = timeout
    this.client = client
    this.id = id
    this.api = api
    this.status = JobStatus.Listening
    this.client.emit('started', this)
    this.client.emit('listening', this)
  }

  async finishedTask () {
    if (this.runTime === RunTimes.Puppeteer) {
      (this.api as Page).goto('about:blank')
    }

    await new Promise<void>((resolve) => setTimeout(() => resolve(), this.timeout))
    this.status = JobStatus.Listening
    this.client.emit('listening', this)
  }

  stop () {
    Client.session.clear(this.id)

    if (this.runTime === RunTimes.Puppeteer) {
      if (!(this.api as Page).isClosed()) (this.api as Page).close()
    }

    this.client.emit('died', this)
    this.client.jobs.delete(this.id)
  }
}