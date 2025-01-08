import * as cheerio from 'cheerio'
import type { RunTimes } from '../type/client'
import { DataTypes, FileEntityType, type DetailsEntity, type DetailsOptions, type FileEntity, type FolderEntity, type ListData, type MapDetailsOptions, type TorrentData } from '../type/prototype'
import { Method } from './Method'


export class Cheerio<
  RunTime extends RunTimes.Cheerio,
  const in out AdditionalDetails extends (DetailsOptions | boolean) = false
> extends Method<RunTime, AdditionalDetails>{

  async extract(params: string): Promise<ListData<AdditionalDetails>> {
    const html = await this.job.api(`${this.url}?${params}`)
    const $ = cheerio.load(html.data)
    const torrents = $('.torrent-list tbody tr')

    const torrentData: TorrentData[] = []

    for (const element of torrents) {
      const category = $(element).find('td:nth-child(1) a').first().attr()?.['title']
      const name = $(element).find('td:nth-child(2) a:not(.comments)').first().attr()?.['title']
      const page = $(element).find('td:nth-child(2) a:not(.comments)').first().attr()?.['href']
      const torrent = $(element).find('td:nth-child(3) a[href$=".torrent"]').first().attr()?.['href']
      const magnet = $(element).find('td:nth-child(3) a[href^="magnet:"]').first().attr()?.['href']
      const size = $(element).find('td:nth-child(4)').first().text().trim()
      const timestamp = parseInt($(element).find('td:nth-child(5)').first().attr()?.['data-timestamp'] ?? '')
      const seeders = parseInt($(element).find('td:nth-child(6)').first().text().trim())
      const leechers = parseInt($(element).find('td:nth-child(7)').first().text().trim())
      const downloaded = parseInt($(element).find('td:nth-child(8)').first().text().trim())

      if (!(
        category
        && name
        && magnet
        && page
        && torrent
      )) continue

      torrentData.push({
        id: parseInt(page.match(/\/view\/(\d+)/)?.[1] ?? '0'),
        hash: magnet?.match(/magnet:\?xt=urn:btih:([a-fA-F0-9]{40}|[a-zA-Z0-9]{32})/)?.[1] ?? '',
        category,
        name,
        links: {
          magnet,
          page,
          torrent
        },
        size,
        timestamp,
        stats: {
          seeders,
          leechers,
          downloaded,
        },
      } satisfies TorrentData)
    }

    const paginationBar = $('ul.pagination li')
    const metadata: ListData<AdditionalDetails>['metadata'] = {
      hasPreviousPage: true,
      hasNextPage: true,
      current: 0,
      total: 0,
      timestamp: Date.now(),
      timeTaken: 0
    }

    for (const item of paginationBar) {
      switch (true) {
      case item.attribs['class']?.includes('active'): {
        const link = $(item).find('a').first()
        const currentPage = link.text().trim() ?? this.url.match(/[?&]p=(\d+)/)?.[1] ?? '0'
                
        metadata['current'] = parseInt(currentPage)
        break
      }
      case item.attribs['class']?.includes('previous'): {
        if (item.attribs['class']?.includes('disabled')) {
          metadata['hasPreviousPage'] =  false
        }
        break
      }
      case item.attribs['class']?.includes('next'): {
        if (item.attribs['class']?.includes('disabled')) {
          metadata['hasNextPage'] =  false
        }
      
        const href = new URL($(item).find('a').attr()?.['href'] ?? '', this.url).toString()
    
        metadata['nextPageLink'] = href
        metadata['nextPage'] = Cheerio.extractPageNumber(new URL(href, this.url).toString()) ?? 0
      
        break
      }
      case item.attribs['class']?.includes('prev'): {
        const href = new URL($(item).find('a').attr()?.['href'] ?? '', this.url).toString()
    
        metadata['previousPageLink'] = href
        metadata['previousPage'] = Cheerio.extractPageNumber(new URL(href, this.url).toString())
        break
      }
      default: {
        const totalPage = metadata['total']
        const currentPage = parseFloat($(item).find('a').text() ?? '0')
                
        if (totalPage === undefined) metadata['total'] = currentPage
        if (Number(totalPage) < currentPage) metadata['total'] = currentPage
      }
      }
    }

    await this.job.finishedTask()

    return {
      type: DataTypes.List,
      count: torrentData.length,
      metadata,
      torrents: torrentData as ListData<AdditionalDetails>['torrents']
    }
  }

  public async details<AdditionalDetails extends (DetailsOptions | boolean)>(
    url: string,
    options?: AdditionalDetails): Promise<MapDetailsOptions<AdditionalDetails>> {
    const html = await this.job.api(url)
    const $ = cheerio.load(html.data)
  
    const details: Partial<DetailsEntity> = {
      type: DataTypes.Details,
      description: undefined,
      submitter: undefined,
      information: undefined,
      files: undefined,
      comments: undefined
    }

    if (options === undefined || options === true || (options !== false && options?.submitter)) {
      const submitter = $('[title="User"]')

      const name = submitter.text()
      const url = submitter.attr()?.['href']

      if (name && url) {
        details.submitter = {
          name,
          url: new URL(url, this.url).toString()
        }
      }
    }

    if (options === undefined || options === true || (options !== false && options?.information)) {
      details.information = $('body > div > div:nth-child(1) > div.panel-body > div:nth-child(3) > div:nth-child(2)').text().trim()
    }

    if (options === true || (options !== false && options?.description)) {
      const description = $('torrent-description')

      switch (options) {
      case true: {
        const html = description.html()
      
        if (html) {
          details.description = html
          break
        }
        break
      }

      default: {
        switch (options.description) {
        case 'text': {
          details.description = description.text().trim()

          break
        }
        default: {
          details.description = description.html() as string
          break
        }
        }
      }
      }
    }

    if (options === undefined || options === true || (options !== false && options?.files)) {
      const torrents = $('.torrent-file-list')

      if (torrents) {
        const structuredData = Cheerio.parseTorrentComponents(torrents.html())
        details.files = structuredData
      }
    }

    if (options === undefined || options === true || (options !== false && options?.comments)) {
      const comments = $('.comment-panel')
      const commentsData: DetailsEntity['comments'] = []
        
      for (const comment of comments) {
        const avatarURL = $(comment).find('img').first().attr('src') ?? ''
        const userName = $(comment).find('[title="User"]').first().text().trim()
        const isUploader = $(comment).find('[title="User"]').first().parent().text().trim().includes('uploader') ?? false
        const message = $(comment).find('[markdown-text]').first().text().trim()
        const time = $(comment).find('[data-timestamp-swap]').first()
        const timestamp = time.data('timestamp') as string
        const publishDate = time.text().replaceAll('UTC', '').trim()

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

    await this.job.finishedTask()
    return details as MapDetailsOptions<AdditionalDetails>
  }

  static parseTorrentComponents(parent: string | null): (FileEntity | FolderEntity)[] {
    if (!parent) return []
    const $ = cheerio.load(parent)
    const result: (FileEntity | FolderEntity)[] = []

    const components = $(parent).children('ul li')
    for (const component of components) {
      const folder = $(component).children('a.folder').first()

      if (folder.length > 0) {
        // It's a folder, parse its children recursively
        const folderName = folder.text().trim()
        if (!folderName) return result
        
        const html = $(component).html()
        if (!html) return result
      
        const childComponents = this.parseTorrentComponents(html)
        result.push({
          type: FileEntityType.Folder,
          name: folderName,
          files: childComponents
        })
      } else {
        const fileSize = $(component).children('span.file-size').text().trim()
        if (!fileSize) return result
        const fileName = $(component).text().replaceAll(fileSize, '')
        if (!fileName) return result

        const readableSize = fileSize.replace('(', '').replace(')', '')
    
        result.push({
          type: FileEntityType.File,
          fileName: fileName,
          readableSize,
          sizeInBytes: this.parseSizeToBytes(readableSize)
        })
      }
    }
    
    return result
  }

  static parseSizeToBytes(sizeString: string): number {
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

  static extractPageNumber(url: string): number | undefined {
    const urlParams = new URL(url).searchParams
    const pageNumber = urlParams.get('p')
    return pageNumber ? parseInt(pageNumber, 10) : undefined
  }
}