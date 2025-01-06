import { DataTypes, type AnimeTorrentData, type ListData } from '../type/prototype'
import { ElementPropertyTypes, FilterObject, type ElementPropertyOptions, type ElementSelector, type FilterKeys, type FilterParams, type FilterValues, type ScraperProps } from '../type/scraper'
import { Client } from './Client'
import { Exporter } from './Exporter'
import { Job } from './Job'

export class Scraper {
  private loadPages: number = 1
  private searchText: string = ''
  private filter?: FilterParams

  constructor(options?: ScraperProps) {
    if (options?.loadPages) this.loadPages = options.loadPages
  }
  
  async search<PageNumber extends number | undefined = undefined>(content: string, options?: {
    filter?: FilterParams
    page?: PageNumber
    loadOnlyPage?: PageNumber extends number ? boolean : never
  }, cache?: Exporter) {
    if (!Client.browser) throw new Error('Client not initialized!')
  
    this.searchText = content
    this.filter = options?.filter
    
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
            : this.loadPages
        },
        async (_, index) => {
          const currentPage = (options?.loadOnlyPage && options?.page)
            ? options.page
            : ((options?.page
              ? (options.page - 1)
              : 0) + (index + 1))
          console.log(currentPage)
          console.log(index)
          console.log(options?.loadOnlyPage, options?.page)
          const job = await Job.requestJob()

          const params = new URLSearchParams({
            'f': String(filterType),
            'c': category,
            'q': content,
            'p': String(currentPage)
          })

          await job.page.goto(`${Client.host}?${params}`, { waitUntil: 'domcontentloaded' })

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
              } satisfies Partial<AnimeTorrentData>
            })

            const paginationElements = document.querySelectorAll('ul.pagination')
            const metadata: ListData['metadata'] = {
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
                console.log(href)
                metadata['nextPageLink'] = href
                metadata['nextPage'] = extractPageNumber(href) ?? 0
  
                break
              }
              case paginationItem.classList.contains('prev'): {
                const href = paginationItem.querySelector('a')?.href ?? ''
                console.log(href)
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

            return {
              type: DataTypes.List,
              metadata,
              count: rowData.length,
              torrents: rowData.filter((data) =>
                Object.values(data).every((value) => value !== undefined)
              ) as ListData['torrents'],
            }
          }, ElementPropertyTypes, DataTypes)
            .finally(async () => await job.finishedTask())
        }
      )
    )

    const flattenedData = extractData.reduce(
      (acc: AnimeTorrentData[], current) => acc.concat(current.torrents),
      cache?.getData()?.torrents ?? []
    )
  
    const maxCurrentPageData = extractData.reduce(
      (max, current) =>
        current.metadata.current > max.metadata.current
          ? current
          : max,
      { metadata: { current: -Infinity } } as ListData
    )

    return new Exporter({
      scraper: this,
      search: {
        content: this.searchText,
        filter: this.filter
      },
      data: {
        type: DataTypes.List,
        metadata: maxCurrentPageData.metadata,
        count: flattenedData.length,
        torrents: flattenedData,
      } satisfies ListData
    })
  }
}