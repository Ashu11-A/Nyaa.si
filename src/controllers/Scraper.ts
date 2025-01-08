import { Cheerio } from '../methods/Cheerio'
import { Puppeteer } from '../methods/Puppeteer'
import { RunTimes } from '../type/client'
import { DataTypes, type DetailsOptions, type ListData, type MapDetailsOptions, type TorrentData } from '../type/prototype'
import { FilterObject, type FilterKeys, type FilterParams, type FilterValues, type ScraperProps } from '../type/scraper'
import { Client } from './Client'
import { Exporter } from './Exporter'
import type { Job } from './Job'

export class Scraper<
  AdditionalDetails extends (DetailsOptions | boolean),
  RunTime extends RunTimes
  >
{
  public readonly pagesToLoad: number = 1
  public readonly loadAdditionalInfo: AdditionalDetails
  public readonly client: Client<RunTime>

  constructor(options: ({ client: Client<RunTime> }) & ScraperProps<AdditionalDetails>) {
    this.client = options.client
    if (options?.pagesToLoad) this.pagesToLoad = options.pagesToLoad
    this.loadAdditionalInfo = (options?.loadAdditionalInfo as AdditionalDetails | undefined) ?? false as AdditionalDetails
  }
  
  async search<PageNumber extends number | undefined = undefined>(content: string, options?: {
    filter?: FilterParams
    page?: PageNumber
    loadOnlyPage?: PageNumber extends number ? boolean : never
  }, cache?: Exporter<AdditionalDetails, RunTime>): Promise<Exporter<AdditionalDetails, RunTime>> {
    const timeStart = Date.now()

    const extractData = (await Promise.all(
      Array.from(
        { 
          length: (options?.loadOnlyPage && options?.page)
            ? 1
            : this.pagesToLoad
        },
        async (_, index) => {
          const currentPage = (options?.loadOnlyPage && options?.page)
            ? options.page
            : ((options?.page
              ? (options.page - 1)
              : 0) + (index + 1))
          const job = await this.client.requestJob()
          const params = Scraper.getSearchParams(content, currentPage, options?.filter)

          switch (this.client.runTime) {
          case RunTimes.Puppeteer: {
            const puppeteer = new Puppeteer({
              job: job as unknown as Job<RunTimes.Puppeteer>,
              url: this.client.getURL(),
              loadAdditionalInfo: this.loadAdditionalInfo
            })
        
            return puppeteer.extract(params)
          }
          case RunTimes.Cheerio: {
            const cheerio = new Cheerio({
              job: job as unknown as Job<RunTimes.Cheerio>,
              loadAdditionalInfo: this.loadAdditionalInfo,
              url: this.client.getURL()
            })

            return cheerio.extract(params)
          }
          }
        }
      )
    )).filter((data) => data !== undefined)

    const flattenedData: ListData<AdditionalDetails>['torrents'] = extractData.reduce(
      (acc, current) => acc.concat(current.torrents),
      cache?.getData()?.torrents ?? []
    )

    if (this.loadAdditionalInfo !== false) {
      await Promise.all(
        Array.from({ length: extractData.length }, async (_, index) => {
          const data = extractData[index]
          await Promise.all(
            Array.from({ length: data.torrents.length }, async (_, index) => {
              const torrent = data.torrents[index]
              const details = await this.details(torrent.id, this.loadAdditionalInfo)
  
              torrent.details = details
            })
          )
        })
      )
    }

    const maxCurrentPageData = extractData.reduce(
      (max, current) =>
        current.metadata.current > max.metadata.current
          ? current
          : max,
      { metadata: { current: -Infinity } } as ListData<AdditionalDetails>
    )

    const timeEnd = Date.now()

    return new Exporter({
      scraper: this,
      search: {
        content,
        filter: options?.filter
      },
      data: {
        type: DataTypes.List,
        metadata: {
          ...maxCurrentPageData.metadata,
          timeTaken: (timeEnd - timeStart) / 1000
        },
        count: flattenedData.length,
        torrents: flattenedData,
      } satisfies ListData<AdditionalDetails>
    })
  }

  
  /**
   * @example
   * 
   * const scraper = new Scraper()
   * 
   * await scraper.details(1918530)
   * await scraper.details('1918530')
   * await scraper.details('https://nyaa.si/view/1918530')
   * 
   * const extract = await scraper.search('re: zero')
   * scraper.details(extract.getData().torrents[0])
   *
   * @public
   * @param {(number | string | TorrentData)} id - Identifier for the torrent (ID, URL, or object).
   * @param {DetailsOptions} options - Options for fetching details.
   */
  public async details (
    id: number | string | TorrentData,
    options?: AdditionalDetails
  ): Promise<MapDetailsOptions<AdditionalDetails>> {
    const normalizeId = Scraper.normalizeId(id)
    if (!normalizeId) throw new Error(`Invalid torrent identifier: ${id}`)
    
    id = normalizeId
    const job = await this.client.requestJob()
    const url = new URL(`/view/${id}`, this.client.getURL()).toString()

    switch (this.client.runTime) {
    case RunTimes.Puppeteer: {
      const puppeteer = new Puppeteer({
        url: this.client.getURL(),
        job: job as unknown as Job<RunTimes.Puppeteer>,
        loadAdditionalInfo: this.loadAdditionalInfo
      })

      return await puppeteer.details(url, options)
    }
    default: {
      const cheerio = new Cheerio({
        url: this.client.getURL(),
        job: job as unknown as Job<RunTimes.Cheerio>,
        loadAdditionalInfo: this.loadAdditionalInfo,
      })

      return await cheerio.details(url, options)
    }
    }
  }

  static getSearchParams (content: string, page: number | undefined = 1, filter?: FilterParams) {
    const filterCode =  String(filter?.filter ?? 0)
    const categories = filter?.category?.split('.')
    let categoryCode = '0_0'

    if (categories) {
      const [categorySelect, subCategorySelect] = categories as [FilterKeys, FilterValues]

      const categoryIndex = Object.entries(FilterObject).findIndex(([category]) => category === categorySelect)
      const subCategoryIndex = Object.entries(FilterObject)[categoryIndex][1].findIndex((subCategory) => subCategorySelect === subCategory)

      categoryCode = `${categoryIndex + 1}_${subCategoryIndex + 1}`
    }

    return new URLSearchParams({
      'f': filterCode,
      'c': categoryCode,
      'q': content,
      'p': String(page)
    }).toString()
  }

  /**
 * Normalizes various input types into a numeric ID.
 * 
 * @private
 * @param {(number | string | TorrentData)} id - Input data to normalize.
 * @returns {(number | null)} - Normalized numeric ID, or `null` if invalid.
 */
  static normalizeId(id: number | string | TorrentData): number | null {
    if (typeof id === 'number') {
      return id
    }

    if (typeof id === 'string') {
      const parsedId = parseInt(id, 10)
      if (!isNaN(parsedId)) {
        return parsedId
      }

      const extractedId = Scraper.extractId(id)
      return extractedId ?? null
    }

    if (typeof id === 'object' && 'id' in id && typeof id.id === 'number') {
      return id.id
    }

    return null
  }
  
  /**
   * Extracts the Id from a url
   *
   * @example
   * 
   * Scraper.extractId('https://nyaa.si/view/1918510') // 1918510
   * 
   * @param {string} url 
   * @returns {*} 
   */
  static extractId(url: string): number | undefined {
    const regex = /^https:\/\/nyaa\.si\/view\/(\d+)$/
    const match = url.match(regex)?.[1]
    return match ? parseInt(match) : undefined
  }
}