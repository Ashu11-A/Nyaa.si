import type { Scraper } from '../controllers/Scraper'
import type { ListData } from './prototype'
import type { FilterParams } from './scraper'

export type ExporterProps = {
    scraper: Scraper
    search: {
        content: string,
        filter?: FilterParams
    }
    data: ListData
}