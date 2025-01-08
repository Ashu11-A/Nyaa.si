import type { AxiosInstance } from 'axios'
import type { Page } from 'puppeteer'
import type { Job } from '../controllers/Job'
import type { RunTimes } from './client'
import type { Client } from '../controllers/Client'

export enum JobStatus {
  Reserved = 'reserved',
  Listening = 'listening',
  Dead = 'dead'
}

export type RunTimeAPI<RunTime extends RunTimes> = RunTime extends RunTimes.Puppeteer
  ? Page
  : AxiosInstance

export type JobProps<RunTime extends RunTimes> = {
  id: string,
  api: RunTimeAPI<RunTime>
  client: Client<RunTime>
  timeout: number,
  runTime: RunTime,
}

export type JobEvents<RunTime extends RunTimes> = {
  died: [Omit<Job<RunTime>, 'create' | 'finishedTask'>];
  started: [Omit<Job<RunTime>, 'create' | 'finishedTask'>];
  reserved: [Omit<Job<RunTime>, 'create' | 'finishedTask'>];
  listening: [Omit<Job<RunTime>, 'create' | 'finishedTask'>];
};