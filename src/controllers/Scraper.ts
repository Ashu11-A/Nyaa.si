import { NodeHtmlMarkdown } from 'node-html-markdown'
import { DataTypes, FileEntityType, type DetailsEntity, type DetailsOptions, type FileEntity, type FolderEntity, type ListData, type MapDetailsOptions, type TorrentData } from '../type/prototype'
import { ElementPropertyTypes, FilterObject, type ElementPropertyOptions, type ElementSelector, type FilterKeys, type FilterParams, type FilterValues, type ScraperProps } from '../type/scraper'
import { Client } from './Client'
import { Exporter } from './Exporter'
import { Job } from './Job'

const nhm = new NodeHtmlMarkdown()

export class Scraper<AdditionalDetails extends (DetailsOptions | boolean)>{
  public readonly pagesToLoad: number = 1
  public readonly loadAdditionalInfo: AdditionalDetails

  constructor(options?: ScraperProps<AdditionalDetails>) {
    if (options?.pagesToLoad) this.pagesToLoad = options.pagesToLoad
    this.loadAdditionalInfo = (options?.loadAdditionalInfo as AdditionalDetails | undefined) ?? false as AdditionalDetails
  }
  
  async search<PageNumber extends number | undefined = undefined>(content: string, options?: {
    filter?: FilterParams
    page?: PageNumber
    loadOnlyPage?: PageNumber extends number ? boolean : never
  }, cache?: Exporter<AdditionalDetails>): Promise<Exporter<AdditionalDetails>> {
    if (!Client.browser) throw new Error('Client not initialized!')
    
    const filterType =  options?.filter?.filter ?? 0
    const categories = options?.filter?.category?.split('.')
    let category = '0_0'

    if (categories) {
      const [categorySelect, subCategorySelect] = categories as [FilterKeys, FilterValues]

      const categoryIndex = Object.entries(FilterObject).findIndex(([category]) => category === categorySelect)
      const subCategoryIndex = Object.entries(FilterObject)[categoryIndex][1].findIndex((subCategory) => subCategorySelect === subCategory)

      category = `${categoryIndex + 1}_${subCategoryIndex + 1}`
    }

    const extractData = await Promise.all(
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
          const job = await Job.requestJob()

          const params = new URLSearchParams({
            'f': String(filterType),
            'c': category,
            'q': content,
            'p': String(currentPage)
          })
          let status: number | undefined = undefined

          do {
            if (status) await new Promise<void>((resolve) => setTimeout(() => resolve(), job.timeout))
            const response = await job.page.goto(`${Client.host}?${params}`, { waitUntil: 'domcontentloaded' })
          
            if (response?.status() === 429) console.log('The site detected too many hits: 429 Too Many Requests')
            
            status = response?.status()
          } while (status === 429)

          return await job.page.evaluate((ElementPropertyTypes, DataTypes) => {
            function findElement({ selector, subSelector, row }: ElementSelector) {
              const query = subSelector ? `${selector} ${subSelector}` : selector

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return (row.querySelector(query) as any) ?? undefined
            }

            function extractElementProperty(options: ElementPropertyOptions) {
              if (!options.element) return undefined
              const { element, type } = options
  
              switch (type) {
              case ElementPropertyTypes.GetAttribute: {
                return element.getAttribute(options.attributeName) ?? undefined
              }
              case ElementPropertyTypes.TextContent: {
                return element.textContent?.trim()
              }
              case ElementPropertyTypes.Href: {
                return (element as HTMLAnchorElement).href
              }
              }
            }

            const torrentListElement = document.querySelector('.torrent-list')
            if (!torrentListElement) throw new Error('Torrent list not available!')
    
            const rows = Array.from(torrentListElement.querySelectorAll('tbody tr'))
            const rowData = rows.map((row) => {
              const category = extractElementProperty({
                type: ElementPropertyTypes.GetAttribute,
                element: findElement({
                  row,
                  selector: 'td:nth-child(1)',
                  subSelector: 'a',
                }),
                attributeName: 'title'
              })
              const title = extractElementProperty({
                type: ElementPropertyTypes.GetAttribute,
                element: findElement({
                  row,
                  selector: 'td:nth-child(2)',
                  subSelector: 'a:not(.comments)',
                }),
                attributeName: 'title'
              })
              const link = extractElementProperty({
                type: ElementPropertyTypes.Href,
                element: findElement({
                  row,
                  selector: 'td:nth-child(2)',
                  subSelector: 'a:not(.comments)'
                })
              })
              const torrent = extractElementProperty({
                type: ElementPropertyTypes.Href,
                element: findElement({
                  row,
                  selector: 'td:nth-child(3)',
                  subSelector: 'a[href$=".torrent"]'
                })
              })
              const magnet = extractElementProperty({
                type: ElementPropertyTypes.Href,
                element: findElement({
                  row,
                  selector: 'td:nth-child(3)',
                  subSelector: 'a[href^="magnet:"]'
                })
              })
              const size = extractElementProperty({
                type: ElementPropertyTypes.TextContent,
                element: findElement({
                  row,
                  selector: 'td:nth-child(4)'
                })
              })
              const timestamp = parseInt(
                extractElementProperty({
                  type: ElementPropertyTypes.GetAttribute,
                  element: findElement({
                    row,
                    selector: 'td:nth-child(5)'
                  }),
                  attributeName: 'data-timestamp'
                }) ?? 'undefined'
              )
              const seeders = parseInt(
                extractElementProperty({
                  type: ElementPropertyTypes.TextContent,
                  element: findElement({
                    row,
                    selector: 'td:nth-child(6)',
                  }),
                }) ?? ''
              )
              const leechers = parseInt(
                extractElementProperty({
                  type: ElementPropertyTypes.TextContent,
                  element: findElement({
                    row,
                    selector: 'td:nth-child(7)'
                  })
                }) ?? ''
              )
              const downloads = parseInt(
                extractElementProperty({
                  type: ElementPropertyTypes.TextContent,
                  element: findElement({
                    row,
                    selector: 'td:nth-child(8)'
                  })
                }) ?? ''
              )
  
              return {
                id: parseInt(
                  link?.match(/\/view\/(\d+)/)?.[1] ?? ''
                ),
                hash: magnet?.match(/magnet:\?xt=urn:btih:([a-fA-F0-9]{40}|[a-zA-Z0-9]{32})/)?.[1],
                title,
                category,
                link,
                torrent,
                magnet,
                size,
                seeders,
                leechers,
                downloads,
                timestamp
              } satisfies Partial<TorrentData>
            })

            const paginationElements = document.querySelectorAll('ul.pagination')
            const metadata: ListData<AdditionalDetails>['metadata'] = {
              hasPreviousPage: true,
              hasNextPage: true,
              current: 0,
              total: 0,
              timestamp: Date.now(),
            }
    
            function extractPageNumber(url: string): number | null {
              const urlParams = new URL(url).searchParams
              const pageNumber = urlParams.get('p')
              return pageNumber ? parseInt(pageNumber, 10) : null
            }
    
            for (const paginationItem of Array.from(paginationElements[0].querySelectorAll('li'))) {
              switch (true) {
              case paginationItem.classList.contains('active'): {
                const link = paginationItem.querySelector('a') as HTMLAnchorElement
                const currentPage = link.childNodes[0].textContent?.trim() ?? window.location.href.match(/[?&]p=(\d+)/)?.[1] ?? '0'
            
                metadata['current'] = parseInt(currentPage)
                break
              }
              case paginationItem.classList.contains('previous'): {
                if (paginationItem.classList.contains('disabled')) {
                  metadata['hasPreviousPage'] =  false
                }
                break
              }
              case paginationItem.classList.contains('next'): {
                if (paginationItem.classList.contains('disabled')) {
                  metadata['hasNextPage'] =  false
                }
  
                const href = paginationItem.querySelector('a')?.href ?? ''

                metadata['nextPageLink'] = href
                metadata['nextPage'] = extractPageNumber(href) ?? 0
  
                break
              }
              case paginationItem.classList.contains('prev'): {
                const href = paginationItem.querySelector('a')?.href ?? ''

                metadata['previousPageLink'] = href
                metadata['previousPage'] = extractPageNumber(href) ?? undefined
                break
              }
              default: {
                const totalPage = metadata['total']
                const currentPage = parseFloat(paginationItem.querySelector('a')?.textContent ?? '0')
            
                if (totalPage === undefined) metadata['total'] = currentPage
                if (Number(totalPage) < currentPage) metadata['total'] = currentPage
              }
              }
            }

            const data: ListData<AdditionalDetails> = {
              type: DataTypes.List,
              metadata,
              count: rowData.length,
              torrents: rowData.filter((data) =>
                Object.values(data).every((value) => value !== undefined)
              ) as ListData<AdditionalDetails>['torrents'],
            }
            return data
          }, ElementPropertyTypes, DataTypes).finally(async () => await job.finishedTask())
        }
      )
    )

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

    return new Exporter({
      scraper: this,
      search: {
        content,
        filter: options?.filter
      },
      data: {
        type: DataTypes.List,
        metadata: maxCurrentPageData.metadata,
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
  public async details<AdditionalDetails extends (DetailsOptions | boolean)>(
    id: number | string | TorrentData,
    options?: AdditionalDetails
  ): Promise<MapDetailsOptions<AdditionalDetails>> {
    const normalizeId = this.normalizeId(id)
    if (!normalizeId) throw new Error(`Invalid torrent identifier: ${id}`)
    
    id = normalizeId
    const job = await Job.requestJob()
    const url = new URL(`/view/${id}`, Client.host).toString()
    let status: number | undefined = undefined

    do {
      if (status) await new Promise<void>((resolve) => setTimeout(() => resolve(), job.timeout))
      const response = await job.page.goto(url, { waitUntil: 'domcontentloaded' })

      if (response?.status() === 429) console.log('The site detected too many hits: 429 Too Many Requests')
      
      status = response?.status()
    } while (status === 429)
    

    return await job.page.evaluate((host, options, DataTypes, FileEntityType) => {
      const details: Partial<DetailsEntity> = {
        type: DataTypes.Details,
        description: undefined,
        submitter: undefined,
        information: undefined,
        files: undefined,
        comments: undefined
      }

      if (options === true || (options !== false && options?.submitter)) {
        const submitterElement = document.querySelector('[title="User"]') as HTMLAnchorElement
        
        const name = submitterElement?.textContent?.trim()
        const url = submitterElement?.getAttribute('href')

        if (name && url) {
          details.submitter = {
            name,
            url: new URL(url, host).toString()
          }
        }
      }

      if (options === true || (options !== false && options?.information)) {
        const informationElement = document.querySelector('body > div > div:nth-child(1) > div.panel-body > div:nth-child(3) > div:nth-child(2)')
        const info = informationElement?.textContent?.trim()

        details.information = info
      }

      if (options === true || (options !== false && options?.description)) {
        const descriptionElement = document.getElementById('torrent-description')

        switch (options) {
        case true: {
          details.description = descriptionElement?.outerHTML ?? descriptionElement?.getHTML()
          break
        }
        default: {
          switch (options.description) {
          case 'text': {
            details.description = descriptionElement?.textContent ?? descriptionElement?.innerText ?? ''
            break
          }
          default: {
            details.description = descriptionElement?.outerHTML ?? descriptionElement?.getHTML()
          }
          }
        }
        }
      }

      if (options === true || (options !== false && options?.files)) {
        function parseSizeToBytes(sizeString: string): number {
          // Define the mapping of units to their byte multipliers
          const units: Record<'B' | 'KiB' | 'MiB' | 'GiB' | 'TiB' | 'PiB', number> = {
            B: 1,
            KiB: 1024,
            MiB: 1024 ** 2,
            GiB: 1024 ** 3,
            TiB: 1024 ** 4,
            PiB: 1024 ** 5,
          }

          // Extract the numeric value and unit from the string
          const regex = /([\d.]+)\s*(B|KiB|MiB|GiB|TiB|PiB)/i
          const match = sizeString.match(regex)

          if (!match) {
            throw new Error(`Invalid size format: ${sizeString}`)
          }

          const [, value, unit] = match
          const numericValue = parseFloat(value)

          // Ensure unit is a key of the units object
          if (!Object.prototype.hasOwnProperty.call(units, unit)) {
            throw new Error(`Unknown unit: ${unit}`)
          }

          const multiplier = units[unit as keyof typeof units]
          return numericValue * multiplier
        }

        function parseTorrentComponents(parentComponent: Element): (FileEntity | FolderEntity)[] {
          const result: (FileEntity | FolderEntity)[] = []

          const components = Array.from(parentComponent.querySelectorAll(':scope > ul > li'))
          for (const component of components) {
            const folder = component.querySelector(':scope > a.folder')

            if (folder) {
              // It's a folder, parse its children recursively
              const folderName = folder.textContent?.trim()
              if (!folderName) return result
          
              const childComponents = parseTorrentComponents(component)
              result.push({
                type: FileEntityType.Folder,
                name: folderName,
                files: childComponents
              })
            } else {
              const fileSize = component.querySelector(':scope > span.file-size')?.textContent?.trim()
              if (!fileSize) return result
              
              const fileName = component.textContent?.replaceAll(fileSize, '')
              if (!fileName) return result

              const readableSize = fileSize.replace('(', '').replace(')', '')

              result.push({
                type: FileEntityType.File,
                fileName: fileName,
                readableSize,
                sizeInBytes: parseSizeToBytes(readableSize)
              })
            }
          }

          return result
        }
        const torrentFiles = document.querySelector('.torrent-file-list')

        if (torrentFiles) {
          const structuredData = parseTorrentComponents(torrentFiles)
          details.files = structuredData
        }
      }

      if (options === true || (options !== false && options?.comments)) {
        const comments = document.querySelectorAll('.comment-panel')
        const commentsData: DetailsEntity['comments'] = []
        
        for (const comment of Array.from(comments)) {
          const avatarURL = (comment.querySelector('img') as HTMLImageElement | null)?.src ?? ''
          const userName = comment.querySelector('[title="User"]')?.textContent?.trim() ?? ''
          const isUploader = comment.querySelector('[title="User"]')?.parentElement?.textContent?.trim().includes('uploader') ?? false
          const message = comment.querySelector('[markdown-text]')?.textContent?.trim() ?? ''
          const time = comment.querySelector('[data-timestamp-swap]')
          const timestamp = time?.getAttribute('data-timestamp')
          const date = time?.getAttribute('title')

          if (!avatarURL || !userName || !message || !timestamp || !date) continue

          commentsData.push({
            avatarURL,
            userName,
            message,
            date,
            timestamp: parseInt(timestamp),
            isUploader
          })
        }

        if (commentsData.length > 0) details.comments = commentsData
      }

      return details as MapDetailsOptions<AdditionalDetails>
    }, Client.host, options, DataTypes, FileEntityType)
      .then((result) => {
        if ((options === true
          || (options !== false && options?.description === true)
          || (options !== false && !['html', 'text'].includes(options?.description as string | undefined ?? '')))) {
          return {
            ...result,
            description: nhm.translate(result.description ?? '')
          }
        }
        return result
      })
      .finally(async () => await job.finishedTask())
  }

  /**
 * Normalizes various input types into a numeric ID.
 * 
 * @private
 * @param {(number | string | TorrentData)} id - Input data to normalize.
 * @returns {(number | null)} - Normalized numeric ID, or `null` if invalid.
 */
  private normalizeId(id: number | string | TorrentData): number | null {
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