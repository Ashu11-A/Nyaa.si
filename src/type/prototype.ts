export enum DataTypes {
    List = 'list',
    Details = 'details'
}

export enum FileEntityType {
    File = 'file',
    Folder = 'folder'
}

export type FolderEntity = {
    type: FileEntityType.Folder
    /**
     * The name of the folder.
     */
    name: string

    /**
     * The list of files contained within the folder.
     */
    files: (FileEntity | FolderEntity)[]
}

export type FileEntity = {
    type: FileEntityType.File
    /**
     * The name of the file.
     */
    fileName: string

    /**
     * The size of the file as a human-readable string (e.g., "1 MiB").
     */
    readableSize: string

    /**
     * The size of the file in bytes.
     */
    sizeInBytes: number
}

export type DetailsOptions = {
    /**
     * @default 'markdown'
     * @type {?(boolean | 'markdown' | 'html' | 'text')}
     */
    description?: boolean | 'markdown' | 'html' | 'text'
    submitter?: boolean | undefined
    information?: boolean
    files?: boolean
    comments?: boolean
}

export type Submitter = {
    name: string
    url: string
}

export type Comment = {
    userName: string
    avatarURL: string
    timestamp: number
    date: string
    message: string
    isUploader: boolean
}

export type DetailsEntity = {
    type: DataTypes.Details
    description: string
    submitter: Submitter
    information: string
    files: (FileEntity | FolderEntity)[]
    comments: Comment[]
}

type OptionalField<T, K extends keyof T> = { [P in K]?: T[P] }
type ConditionalField<T, K extends keyof T, Condition> = Condition extends true | string ? Pick<T, K> : OptionalField<T, K>

export type MapDetailsOptions<AdditionalDetails extends (DetailsOptions | boolean)> = {
    type: DataTypes.Details
} & (AdditionalDetails extends true
    ? DetailsEntity
    : AdditionalDetails extends DetailsOptions
    ? ConditionalField<DetailsEntity, 'description', AdditionalDetails['description']>
      & ConditionalField<DetailsEntity, 'submitter', AdditionalDetails['submitter']>
      & ConditionalField<DetailsEntity, 'information', AdditionalDetails['information']>
      & ConditionalField<DetailsEntity, 'files', AdditionalDetails['files']>
      & ConditionalField<DetailsEntity, 'comments', AdditionalDetails['comments']>
      & ConditionalField<DetailsEntity, 'description', AdditionalDetails['description']>
    : undefined)

export type TorrentData = {
    id: number
    hash: string
    category: string
    title: string
    link: string
    torrent: string
    magnet: string
    timestamp: number
    size: string
    seeders: number
    leechers: number
    downloads: number
}

export type TorrentDataWithDetails<AdditionalDetails extends (DetailsOptions | boolean)> = {
    details: MapDetailsOptions<AdditionalDetails>
} & TorrentData

export type ListData<AdditionalDetails extends (DetailsOptions | boolean)> = {
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
    torrents: (AdditionalDetails extends (DetailsOptions | boolean) ? TorrentDataWithDetails<AdditionalDetails> : TorrentData)[]
}