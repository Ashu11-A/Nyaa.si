import type { Page } from 'puppeteer'
import { DataTypes, type AnimeTorrentData, type ListData } from '../type/prototype'
import { ElementPropertyTypes, FilterObject, type ElementPropertyOptions, type ElementSelector, type FilterKeys, type FilterParams, type FilterValues, type ScraperProps } from '../type/scraper'
import { Client } from './Client'

enum PageStatus {
  Reserved = 'reserved',
  Listening = 'listening',
  Dead = 'dead'
}

export class Scraper {
  protected pages = new Map<string, {
    page: Page
    status: PageStatus
    currentPage: number | undefined
  }>()
  
  public currentPage: number = 0
  public totalPages: number = 0
  public initialPageCount: number = 1
  public concurrentJobs: number = 1

  constructor(options?: ScraperProps) {
    if (options?.concurrentJobs) this.concurrentJobs = options.concurrentJobs
    if (options?.initialPageCount) this.initialPageCount = options.initialPageCount
  }
  
  async search(text: string, filter?: FilterParams) {
    if (!Client.browser) throw new Error('Client not initialized!')
    
    const filterType = filter?.filter ?? 0
    let category = '0_0'

    const categories = filter?.category?.split('.')
    if (categories) {
      console.log(categories)
      const [categorySelect, subCategorySelect] = categories as [FilterKeys, FilterValues]

      const categoryIndex = Object.entries(FilterObject).findIndex(([category]) => category === categorySelect)
      const subCategoryIndex = Object.entries(FilterObject)[categoryIndex][1].findIndex((subCategory) => subCategorySelect === subCategory)

      category = `${categoryIndex + 1}_${subCategoryIndex + 1}`
    }

    await Promise.all(
      new Array(this.concurrentJobs)
        .fill(undefined)
        .map(() => (async () => {
          const page = await Client.newPage()
          const pageId = (page.mainFrame() as unknown as { _id: string })._id

          const currentPage = ++this.currentPage
          this.currentPage = currentPage

          if (this.currentPage > this.initialPageCount) {
            this.pages.set(pageId, {
              page,
              status: PageStatus.Listening,
              currentPage: undefined
            })
            return
          }

          const params = new URLSearchParams({
            'f': String(filterType),
            'c': category,
            'q': text,
            'p': String(currentPage)
          })

          await page.goto(`${Client.host}?${params}`, { waitUntil: 'networkidle0' })
          this.pages.set(pageId, {
            page,
            status: PageStatus.Reserved,
            currentPage: currentPage
          })
        })())
    )
  }

  async extract() {

    const extractedDataList = (await Promise.all(
      Array.from(this.pages.keys()).map((pageId) =>
        (async () => {
          const options = this.pages.get(pageId)
          if (!options?.page || !options?.currentPage) return

          return await options.page.evaluate((ElementPropertyTypes, DataTypes) => {
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
              data: rowData.filter((data) =>
                Object.values(data).every((value) => value !== undefined)
              ) as ListData['data'],
            }
          }, ElementPropertyTypes, DataTypes).finally(() => {
            this.pages.set(pageId, { ...options, status: PageStatus.Listening })
          })
        })()
      )
    )).filter((data) => data !== undefined)

    console.log(extractedDataList)
  
    const flattenedData = extractedDataList.reduce(
      (acc: AnimeTorrentData[], current) => acc.concat(current.data),
      []
    )
  
    const maxCurrentPageData = extractedDataList.reduce(
      (max, current) =>
        current.metadata.current > max.metadata.current
          ? current
          : max,
      { metadata: { current: -Infinity } } as ListData
    )
  
    return {
      type: DataTypes.List,
      metadata: maxCurrentPageData.metadata,
      count: flattenedData.length,
      data: flattenedData,
    } satisfies ListData
  }
  

  async close() {
    for (const id of this.pages.keys()) {
      const page = this.pages.get(id)?.page
      if (!page) continue

      Client.session.clear(id)
      if (!page.isClosed()) page.close()
    }
  }
}