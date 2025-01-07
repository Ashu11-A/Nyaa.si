import type { Job } from '../controllers/Job'

export enum JobStatus {
  Reserved = 'reserved',
  Listening = 'listening',
  Dead = 'dead'
}

export type JobEvents = {
  died: (job: Omit<Job, 'create' | 'finishedTask'>) => void
  started: (job: Omit<Job, 'create' | 'finishedTask'>) => void
  reserved: (job: Omit<Job, 'create' | 'finishedTask'>) => void
  listening: (job: Omit<Job, 'create' | 'finishedTask'>) => void
}