import type { ExporterProps } from '../type/exporter'
import type { DetailsOptions, ListData } from '../type/prototype'

export class Exporter<AdditionalDetails extends (DetailsOptions | boolean)>{
  private scraper: ExporterProps<AdditionalDetails>['scraper']
  private search: ExporterProps<AdditionalDetails>['search']
  private data: ExporterProps<AdditionalDetails>['data']

  constructor (options: ExporterProps<AdditionalDetails>) {
    this.scraper = options.scraper
    this.data = options.data
    this.search = options.search
  }

  getData () {
    return this.data
  }

  private setData (data: ListData<AdditionalDetails>) {
    this.data = data
  }

  async addNextPage (loadPages: number = 1) {
    if (!this.data.metadata.hasNextPage) return this

    const exporter = await this.scraper.search(this.search.content, {
      page: this.data.metadata.current + 1,
      loadOnlyPage: loadPages > 1 ? false : true,
      filter: this.search.filter
    }, this)

    this.setData(exporter.data)
    return this
  }

  async getNextPage (loadPages: number = 1) {
    if (!this.data.metadata.hasNextPage) throw new Error('There is no next page for fetching information')

    return await this.scraper.search(this.search.content, {
      page: this.data.metadata.current + 1,
      loadOnlyPage: loadPages > 1 ? false : true,
      filter: this.search.filter
    })
  }
}