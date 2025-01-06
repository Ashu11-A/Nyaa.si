export enum DataTypes {
    List = 'List'
}

export type AnimeTorrentData = {
    id: number
    category: string
    title: string
    link: string
    torrent: string
    magnet: string
    hash: string
    size: string
    timestamp: number
    seeders: number
    leechers: number
    downloads: number
}

export type Exporter = {
  data: ListData
  nextPage: (page?: number) => Promise<void>
  loadDetails: (details?: {
    description?: boolean | 'markdown' | 'html' | 'text'
    submitter?: boolean
    information?: boolean
    files?: boolean | {
        name?: boolean
        size?: boolean
    }
    comments?: boolean | {
        userName?: boolean
        avatarURL?: boolean
        timestamp?: boolean
        date?: boolean
        message?: boolean
    }
}) => Promise<Exporter>
}

export type ListData = {
    type: DataTypes.List
    metadata: {
        hasPreviousPage: boolean
        previousPage?: number
        previousPageLink?: string
        hasNextPage: boolean
        nextPage?: number
        nextPageLink?: string
        current: number
        total: number
        timestamp: number
    },
    count: number
    data: AnimeTorrentData[]
}