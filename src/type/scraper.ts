import type { DetailsOptions } from './prototype'

export const FilterObject = {
  anime: [
    'anime_music_video',
    'english_translated',
    'non_english_translated',
    'raw'
  ],
  audio: [
    'lossless',
    'lossy'
  ],
  literature: [
    'english_translated',
    'non_english_translated',
    'raw'
  ],
  live_action: [
    'english_translated',
    'idol_promotional_video',
    'non_english_translated',
    'raw'
  ],
  pictures: [
    'graphics',
    'photos'
  ],
  software: [
    'applications',
    'games'
  ]
} as const

export type FilterSearch = typeof FilterObject
export type FilterKeys = keyof FilterSearch
export type FilterValues = FilterSearch[keyof FilterSearch][number]

export type NestedKeys<T> = T extends readonly unknown[]
  ? T[number] & string
  : T extends Record<string, unknown>
  ? { [K in keyof T]: 
    | `${K & string}`
    | `${K & string}.${NestedKeys<T[K]>}`
  }[keyof T]
  : never;

export type FilterSearchPaths = NestedKeys<FilterSearch>

export enum ElementPropertyTypes {
  TextContent = 'textContent',
  Href = 'href',
  GetAttribute = 'getAttribute'
}

export enum Filters {
  /**
   * All torrents.
   */
  NoFilter = 0,
  /**
   * entries (remake) are torrents that match any of the following:
   *  -> Reencode of original release.
   *  -> Remux of another uploader's original release for hardsubbing and/or fixing purposes.
   *  -> Reupload of original release using non-original file names.
   *  -> Reupload of original release with missing and/or unrelated additional files.
   */
  NoRemakes = 1,
  /**
   * Torrents uploaded by trusted users.
   */
  TrustedOnly = 2
}

export type FilterParams = {
  category?: FilterSearchPaths
  /**
   * @default Filters.NoFilter
   */
  filter?: Filters
}

export type ElementHref = {
  type: ElementPropertyTypes.Href
  element: HTMLAnchorElement
}

export type ElementTextContent = {
  type: ElementPropertyTypes.TextContent
  element: HTMLElement
}

export type ElementGetAttribute = {
  type: ElementPropertyTypes.GetAttribute
  attributeName: string
  element: HTMLElement
}

export type ElementPropertyOptions = (ElementHref | ElementTextContent | ElementGetAttribute)
export type ElementSelector = {
  row: Element
  selector: string;
  subSelector?: string;
}

export type ScraperProps<AdditionalDetails extends (DetailsOptions | boolean)> = {
  /**
   * How many pages will be loaded for web scraping, each page has 75 torrents
   * 
   * @default 1
   */
  pagesToLoad?: number

  /**
   *  This carries additional information such as:
   *  description, submitter, information, files, comments
   *  
   *  But it results in 75 requests per page, so I don't recommend using it!
   *  @default false
   */
  loadAdditionalInfo: AdditionalDetails | DetailsOptions
} 