import type { Job } from '../controllers/Job'
import type { RunTimes } from '../type/client'
import type { DetailsOptions, ListData, MapDetailsOptions, TorrentData } from '../type/prototype'

type MethodOptions<
  RunTime extends RunTimes,
  AdditionalDetails extends (DetailsOptions | boolean)
> = {
  job: Job<RunTime>
  url: string
  loadAdditionalInfo: AdditionalDetails
}

export abstract class Method<RunTime extends RunTimes, const in out AdditionalDetails extends (DetailsOptions | boolean) = false> {
  public readonly job: Job<RunTime>
  public readonly url: string
  public readonly loadAdditionalInfo: AdditionalDetails

  constructor ({ job, url, loadAdditionalInfo }: MethodOptions<RunTime, AdditionalDetails>) {
    this.job = job
    this.url = url
    this.loadAdditionalInfo = loadAdditionalInfo ?? false as AdditionalDetails
  }

  abstract extract (params: string): Promise<ListData<AdditionalDetails>>

  abstract details<AdditionalDetails extends (DetailsOptions | boolean)>(
    id: number | string | TorrentData,
    options?: AdditionalDetails
  ): Promise<MapDetailsOptions<AdditionalDetails>>
}