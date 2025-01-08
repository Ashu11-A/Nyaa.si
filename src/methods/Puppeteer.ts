import { NodeHtmlMarkdown } from 'node-html-markdown'
import type { RunTimes } from '../type/client'
import { DataTypes, FileEntityType, type DetailsEntity, type DetailsOptions, type FileEntity, type FolderEntity, type ListData, type MapDetailsOptions, type TorrentData } from '../type/prototype'
import { ElementPropertyTypes, type ElementPropertyOptions, type ElementSelector } from '../type/scraper'
import { Method } from './Method'

const nhm = new NodeHtmlMarkdown()

export class Puppeteer<
  RunTime extends RunTimes.Puppeteer,
  const in out AdditionalDetails extends (DetailsOptions | boolean) = false
> extends Method<RunTime, AdditionalDetails>{

  async extract (params: string) {
    await this.waitForConnect(`${this.url}?${params}`)

    return await this.job.api.evaluate((ElementPropertyTypes, DataTypes) => {
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
        const categoryLabel = extractElementProperty({
          type: ElementPropertyTypes.GetAttribute,
          element: findElement({
            row,
            selector: 'td:nth-child(1)',
            subSelector: 'a',
          }),
          attributeName: 'title'
        })
        const name = extractElementProperty({
          type: ElementPropertyTypes.GetAttribute,
          element: findElement({
            row,
            selector: 'td:nth-child(2)',
            subSelector: 'a:not(.comments)',
          }),
          attributeName: 'title'
        })
        const page = extractElementProperty({
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
        const downloaded = parseInt(
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
            page?.match(/\/view\/(\d+)/)?.[1] ?? ''
          ),
          hash: magnet?.match(/magnet:\?xt=urn:btih:([a-fA-F0-9]{40}|[a-zA-Z0-9]{32})/)?.[1],
          name,
          timestamp,
          size,
          category: categoryLabel,
          links: (page && magnet && torrent) ? {
            page,
            magnet,
            torrent
          } : undefined,
          stats: {
            seeders,
            leechers,
            downloaded
          },
        } satisfies Partial<TorrentData>
      })
    
      const paginationElements = document.querySelectorAll('ul.pagination')
      const metadata: ListData<AdditionalDetails>['metadata'] = {
        hasPreviousPage: true,
        hasNextPage: true,
        current: 0,
        total: 0,
        timestamp: Date.now(),
        timeTaken: 0
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
    }, ElementPropertyTypes, DataTypes).finally(async () => await this.job.finishedTask())
  }

  async details<AdditionalDetails extends (DetailsOptions | boolean)>(
    id: number | string | TorrentData,
    options?: AdditionalDetails
  ) {
    const url = new URL(`/view/${id}`, this.url).toString()
    await this.waitForConnect(url)

    return await this.job.api.evaluate((host, options, DataTypes, FileEntityType) => {
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
          const publishDate = time?.getAttribute('title')
  
          if (!avatarURL || !userName || !message || !timestamp || !publishDate) continue
  
          commentsData.push({
            avatarURL,
            userName,
            message,
            publishDate,
            timestamp: parseInt(timestamp),
            isUploader
          })
        }
  
        if (commentsData.length > 0) details.comments = commentsData
      }
  
      return details as MapDetailsOptions<AdditionalDetails>
    }, this.url, options, DataTypes, FileEntityType)
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
      .finally(async () => await this.job.finishedTask())
  }

  private async waitForConnect (url: string) {
    let status: number | undefined = undefined
      
    do {
      if (status) await new Promise<void>((resolve) => setTimeout(() => resolve(), this.job.timeout))
      const response = await this.job.api.goto(url, { waitUntil: 'domcontentloaded' })
                
      if (response?.status() === 429) console.log('The site detected too many hits: 429 Too Many Requests')
                  
      status = response?.status()
    } while (status === 429)
  }
}