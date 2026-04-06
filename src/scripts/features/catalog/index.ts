import { storage } from '../../storage.ts'

import type { CatalogCache, CatalogEntry } from '../../../types/local.ts'

const CMD_CSV_URL = 'https://raw.githubusercontent.com/merill/cmd/main/website/config/commands.csv'

const MSPORTALS_BASE = 'https://raw.githubusercontent.com/adamfowlerit/msportals.io/master/_data/portals/'

const MSPORTALS_FILES = [
    'admin.json',
    'china.json',
    'consumer.json',
    'edu.json',
    'licensing.json',
    'thirdparty.json',
    'training.json',
    'us-govt.json',
    'user.json',
]

const ONE_DAY_MS = 24 * 60 * 60 * 1000

// msportals.io JSON shape
interface PortalGroup {
    groupName: string
    portals: {
        portalName: string
        primaryURL: string
        secondaryURLs?: { icon: string; url: string }[]
        note?: string
    }[]
}

/**
 * Get the cached catalog or fetch fresh data.
 * Called on extension startup and when searchbar opens.
 */
export async function getCatalog(): Promise<CatalogEntry[]> {
    const local = await storage.local.get('catalogCache')
    const cache = local.catalogCache

    if (cache && Date.now() - cache.lastFetch < ONE_DAY_MS) {
        return cache.entries
    }

    // Fetch in background, return cache if available
    refreshCatalog(cache?.entries)

    return cache?.entries ?? []
}

/**
 * Force a refresh of the catalog data from remote sources.
 * Falls back to existing cache on network failure.
 */
async function refreshCatalog(fallback?: CatalogEntry[]): Promise<void> {
    try {
        const [cmdEntries, portalEntries] = await Promise.all([
            fetchCmdCsv(),
            fetchMsPortals(),
        ])

        const entries = deduplicateEntries([...cmdEntries, ...portalEntries])

        const catalogCache: CatalogCache = {
            lastFetch: Date.now(),
            entries,
        }

        storage.local.set({ catalogCache })
    } catch (err) {
        console.warn('Catalog refresh failed, using cache', err)

        // If we have no cache at all, store empty to avoid repeated failures
        if (!fallback) {
            storage.local.set({
                catalogCache: { lastFetch: Date.now(), entries: [] },
            })
        }
    }
}

/**
 * Parse merill/cmd commands.csv into CatalogEntry[].
 * CSV columns: Command, Alias, Description, Keywords, Category, Url
 */
async function fetchCmdCsv(): Promise<CatalogEntry[]> {
    const response = await fetch(CMD_CSV_URL)

    if (!response.ok) {
        throw new Error(`cmd CSV fetch failed: ${response.status}`)
    }

    const text = await response.text()
    return parseCmdCsv(text)
}

export function parseCmdCsv(text: string): CatalogEntry[] {
    const lines = text.split('\n')
    const entries: CatalogEntry[] = []

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()

        if (!line) {
            continue
        }

        const fields = parseCSVLine(line)

        if (fields.length < 6) {
            continue
        }

        const [command, alias, description, keywords, category, url] = fields

        if (!url || !description) {
            continue
        }

        // Build searchable keywords from command + alias + keywords
        const searchKeywords = [command, alias, keywords]
            .filter(Boolean)
            .join(' ')

        entries.push({
            name: description,
            url: url,
            description: description,
            keywords: searchKeywords,
            category: category || 'Other',
            source: 'cmd',
        })
    }

    return entries
}

/**
 * Parse a single CSV line handling quoted fields.
 * CSV fields may contain commas inside quotes.
 */
function parseCSVLine(line: string): string[] {
    const fields: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"'
                i++
            } else {
                inQuotes = !inQuotes
            }
        } else if (char === ',' && !inQuotes) {
            fields.push(current.trim())
            current = ''
        } else {
            current += char
        }
    }

    fields.push(current.trim())
    return fields
}

/**
 * Fetch all msportals.io JSON files and flatten into CatalogEntry[].
 */
async function fetchMsPortals(): Promise<CatalogEntry[]> {
    const entries: CatalogEntry[] = []

    const results = await Promise.allSettled(
        MSPORTALS_FILES.map(async (file) => {
            const response = await fetch(MSPORTALS_BASE + file)

            if (!response.ok) {
                throw new Error(`msportals ${file} fetch failed: ${response.status}`)
            }

            return response.json() as Promise<PortalGroup[]>
        }),
    )

    for (const result of results) {
        if (result.status === 'fulfilled') {
            for (const group of result.value) {
                for (const portal of group.portals) {
                    entries.push({
                        name: portal.portalName,
                        url: portal.primaryURL,
                        description: portal.note ? `${portal.portalName} - ${portal.note}` : portal.portalName,
                        keywords: [group.groupName, portal.note ?? ''].filter(Boolean).join(' '),
                        category: group.groupName,
                        source: 'msportals',
                    })
                }
            }
        }
    }

    return entries
}

/**
 * Remove duplicate entries by URL, preferring cmd entries over msportals.
 */
function deduplicateEntries(entries: CatalogEntry[]): CatalogEntry[] {
    const seen = new Map<string, CatalogEntry>()

    for (const entry of entries) {
        // Normalize URL for dedup: strip trailing slash and query
        const key = entry.url.replace(/\/?\??$/, '').toLowerCase()

        const existing = seen.get(key)

        // Prefer cmd source since it has richer keyword/alias data
        if (!existing || (entry.source === 'cmd' && existing.source !== 'cmd')) {
            seen.set(key, entry)
        }
    }

    return Array.from(seen.values())
}
