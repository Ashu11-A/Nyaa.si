import type { ExporterProps } from '../type/exporter'
import type { ListData, LoadDetailsTypes } from '../type/prototype'

export class Exporter {
  private scraper
  public readonly search
  private data

  constructor (options: ExporterProps) {
    this.scraper = options.scraper
    this.data = options.data
    this.search = options.search
  }

  getData() {
    return this.data
  }
  private setData (data: ListData) {
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

  // loadDetails(details: LoadDetailsTypes | boolean = true) {

  // }
}