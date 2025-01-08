import type { Scraper } from '../controllers/Scraper'
import type { RunTimes } from './client'
import type { DetailsOptions, ListData } from './prototype'
import type { FilterParams } from './scraper'

export type ExporterProps<
    AdditionalDetails extends (DetailsOptions | boolean),
    RunTime extends RunTimes
>= {
    scraper: Scraper<AdditionalDetails, RunTime>
    search: {
        content: string,
        filter?: FilterParams
    }
    data: ListData<AdditionalDetails>
}