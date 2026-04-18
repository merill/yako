import type { Background } from './shared.ts'
import type { Sync } from './sync.ts'

export type BackgroundUrlState = 'NONE' | 'LOADING' | 'OK' | 'NOT_URL' | 'CANT_REACH' | 'NOT_MEDIA'
export type SyncType = 'browser' | 'gist' | 'url' | 'off'

export interface CatalogEntry {
    name: string
    url: string
    description: string
    keywords: string
    category: string
    source: 'cmd' | 'msportals'
    iconUrl?: string
}

export interface CatalogCache {
    lastFetch: number
    entries: CatalogEntry[]
}

export interface CmdCommand {
    command: string
    alias: string
    description: string
    keywords: string
    category: string
    url: string
}

export interface CmdmsCache {
    lastFetch: number
    commands: CmdCommand[]
}

export interface MsPortal {
    portalName: string
    primaryURL: string
    shortURL?: string
    secondaryURLs?: { icon: string; url: string }[]
    note?: string
}

export interface MsPortalGroup {
    groupName: string
    portals: MsPortal[]
}

export interface MsPortalsCache {
    lastFetch: number
    categories: Record<string, MsPortalGroup[]>
}

export interface IconPickerEntry {
    id: string
    name: string
    altnames: string
    group: string
    icon: string
    source: 'product' | 'icon'
    type?: string
    prodfamilies?: string[]
    monochrome?: boolean
}

export interface UrlIconCacheEntry {
    url: string
    dataUri: string
}

export interface Local {
    operaExplained?: true

    // Sync
    gistId?: string
    gistToken?: string
    distantUrl?: string
    pastebinToken?: string
    syncType?: SyncType

    // Backgrounds
    backgroundCollections: Record<string, Background[]>
    backgroundUrls: Record<string, BackgroundUrl>
    backgroundFiles: Record<string, BackgroundFile>
    backgroundLastChange?: string
    backgroundCompressFiles?: boolean

    // Online
    syncStorage?: Sync

    // Catalog
    catalogCache?: CatalogCache

    // cmd.ms terminal
    cmdmsCache?: CmdmsCache

    // msportals.io
    msportalsCache?: MsPortalsCache

    // Links
    [key: `x-icon-${string}`]: string
}

export interface BackgroundUrl {
    lastUsed: string
    format: 'image' | 'video'
    state: BackgroundUrlState
    duration?: number
}

/**
 * Bad planning in version 21: interface structure is image only.
 *
 * Video options "zoom, fade, playbackRate" have been added separately
 * "position" remains image only...
 */
export interface BackgroundFile {
    format: 'image' | 'video'
    lastUsed: string
    selected?: boolean
    video?: {
        playbackRate: number
        fade: number
        zoom: number
    }
    position?: {
        size: string
        x: string
        y: string
    }
}
