import type { Scraper } from '../controllers/Scraper'
import type { DetailsOptions, ListData } from './prototype'
import type { FilterParams } from './scraper'

export type ExporterProps<AdditionalDetails extends (DetailsOptions | boolean)>= {
    scraper: Scraper<AdditionalDetails>
    search: {
        content: string,
        filter?: FilterParams
    }
    data: ListData<AdditionalDetails>
}