import { getCatalog } from './index.ts'
import { quickLinks } from '../links/index.ts'
import { isElem, isLink } from '../links/helpers.ts'
import { getHTMLTemplate } from '../../shared/dom.ts'
import { storage } from '../../storage.ts'
import portalIconMap from '../../../data/portal-icons.json' with { type: 'json' }
import type { CatalogEntry } from '../../../types/local.ts'
import type { LinkElem, LinkIcon } from '../../../types/shared.ts'

const ICON_BASE_URL = 'https://raw.githubusercontent.com/loryanstrant/MicrosoftCloudLogos/main/'

// ─── Constants ───

// Category grouping order derived from cmd.ms CATEGORY_ORDER
const _CMD_CATEGORY_ORDER = [
    'Entra',
    'Intune',
    'Defender',
    'XDR Sentinel',
    'Purview',
    'Microsoft 365',
    'Azure',
    'My Pages',
    'General',
]

// msportals group names normalised to category buckets
// Entries that don't match get bucketed under their original group name
const MSPORTALS_CATEGORY_MAP: Record<string, string> = {
    'Microsoft 365 Admin Portals': 'Microsoft 365',
    'End User Portals - Microsoft 365 Apps': 'Microsoft 365',
    'End User Portals - Other Microsoft Apps': 'Microsoft 365',
    'Azure Admin Portals': 'Azure',
    'Azure IT Admin Portals - Sub Portal Links': 'Azure',
    'Admin - Entra Portals': 'Entra',
    'Admin - AI Portals': 'AI',
    'Admin - Microsoft Licensing/Support Portals': 'Licensing',
    'Admin - Microsoft Defender / Security Portals': 'Defender',
    'Admin - Developer Portals': 'Developer',
    'Admin - Health / Status Portals': 'Health & Status',
    'Admin - Microsoft Partner / MSP Portals': 'Partner',
    'Admin - Microsoft Trials': 'Trials',
    'Admin - Other Useful Microsoft Portals': 'Other',
}

// ─── State ───

let dialog: HTMLDialogElement | null = null
let catalogEntries: CatalogEntry[] = []
let loaded = false
let activeCategory = 'All'

// ─── Public API ───

export async function openCatalogBrowser(): Promise<void> {
    if (!dialog) {
        dialog = createDialog()
    }

    if (!loaded) {
        catalogEntries = await getCatalog()
        loaded = true
    }

    document.body.appendChild(dialog)
    dialog.showModal()

    // Trigger the show transition (must be after showModal for CSS transition to fire)
    requestAnimationFrame(() => {
        dialog!.classList.add('shown')
    })

    populateCategoryDropdown()
    renderGrid()

    const search = dialog.querySelector<HTMLInputElement>('#catalog-browser-search')
    setTimeout(() => search?.focus(), 50)
}

export function closeCatalogBrowser(): void {
    if (!dialog) return

    dialog.classList.remove('shown')

    // Wait for transition before closing
    setTimeout(() => {
        dialog?.close()
        dialog?.remove()
    }, 350)
}

// ─── Dialog creation ───

function createDialog(): HTMLDialogElement {
    const dlg = getHTMLTemplate<HTMLDialogElement>('catalog-browser-template', 'dialog')

    // Close button
    const closeBtn = dlg.querySelector<HTMLButtonElement>('#catalog-browser-close')
    closeBtn?.addEventListener('click', closeCatalogBrowser)

    // Backdrop click to close
    dlg.addEventListener('click', (event) => {
        if (event.target === dlg) {
            closeCatalogBrowser()
        }
    })

    // Escape key to close
    dlg.addEventListener('cancel', (event) => {
        event.preventDefault()
        closeCatalogBrowser()
    })

    // Search input
    const search = dlg.querySelector<HTMLInputElement>('#catalog-browser-search')
    search?.addEventListener('input', () => {
        renderGrid()
    })

    // Category dropdown
    const select = dlg.querySelector<HTMLSelectElement>('#catalog-browser-category')
    select?.addEventListener('change', () => {
        activeCategory = select.value
        renderGrid()
    })

    return dlg
}

// ─── Category dropdown ───

function populateCategoryDropdown(): void {
    if (!dialog) return

    const select = dialog.querySelector<HTMLSelectElement>('#catalog-browser-category')
    if (!select) return

    // Keep only the first "All categories" option
    while (select.options.length > 1) {
        select.remove(1)
    }

    for (const cat of getCategories()) {
        const option = document.createElement('option')
        option.value = cat
        option.textContent = cat
        select.appendChild(option)
    }

    select.value = activeCategory
}

// ─── Rendering ───

function renderGrid(): void {
    if (!dialog) return

    const grid = dialog.querySelector<HTMLDivElement>('#catalog-browser-grid')
    if (!grid) return

    grid.innerHTML = ''

    const search = dialog.querySelector<HTMLInputElement>('#catalog-browser-search')
    const query = (search?.value ?? '').toLowerCase().trim()
    const tokens = query ? query.split(/\s+/).filter(Boolean) : []

    // Get entries grouped by normalised category
    const grouped = getGroupedEntries(tokens)

    if (grouped.length === 0) {
        const noRes = document.createElement('div')
        noRes.className = 'catalog-browser-no-results'
        noRes.textContent = 'No portals found.'
        grid.appendChild(noRes)
        return
    }

    for (const group of grouped) {
        const panel = document.createElement('div')
        panel.className = 'catalog-browser-group'

        const titleEl = document.createElement('h2')
        titleEl.textContent = group.category
        panel.appendChild(titleEl)

        const itemsContainer = document.createElement('div')
        itemsContainer.className = 'catalog-browser-items'

        for (const entry of group.entries) {
            const item = createItemTile(entry)
            itemsContainer.appendChild(item)
        }

        panel.appendChild(itemsContainer)
        grid.appendChild(panel)
    }
}

function getPortalIconUrl(name: string): string | undefined {
    const iconMap = portalIconMap as Record<string, string>
    const path = iconMap[name]
    if (!path || path.startsWith('_')) return undefined
    return ICON_BASE_URL + encodeURI(path)
}

function createItemTile(entry: CatalogEntry): HTMLDivElement {
    const item = document.createElement('div')
    item.className = 'catalog-browser-item'
    item.title = entry.url

    // Icon: use real icon from mapping if available, otherwise pastel initials
    const iconWrap = document.createElement('div')
    iconWrap.className = 'catalog-browser-item-icon'

    const iconUrl = getPortalIconUrl(entry.name)

    if (iconUrl) {
        const img = document.createElement('img')
        img.src = iconUrl
        img.alt = ''
        img.loading = 'lazy'
        img.addEventListener('error', () => {
            // On load error, fall back to pastel initials
            img.remove()
            iconWrap.style.backgroundColor = getPastelColor(entry.name)
            iconWrap.textContent = getInitials(entry.name)
        })
        iconWrap.appendChild(img)
    } else {
        iconWrap.style.backgroundColor = getPastelColor(entry.name)
        iconWrap.textContent = getInitials(entry.name)
    }

    // Name label
    const nameEl = document.createElement('span')
    nameEl.className = 'catalog-browser-item-name'
    nameEl.textContent = entry.name

    // URL label (strip protocol)
    const urlEl = document.createElement('span')
    urlEl.className = 'catalog-browser-item-url'
    urlEl.textContent = entry.url.replace(/^https?:\/\//, '')

    item.appendChild(iconWrap)
    item.appendChild(nameEl)
    item.appendChild(urlEl)

    // Click to toggle add/remove
    item.addEventListener('click', async () => {
        if (item.classList.contains('added')) {
            // Find and remove the link by URL
            const data = await storage.sync.get()
            const id = findLinkIdByUrl(data, entry.url)

            if (id) {
                quickLinks(undefined, { deleteLinks: [id] })
            }

            item.classList.remove('added', 'just-added')
        } else {
            const addLink: { title: string; url: string; icon?: LinkIcon } = {
                title: entry.name,
                url: entry.url,
            }

            // Auto-apply portal icon from the mapping if available
            const portalIconUrl = getPortalIconUrl(entry.name)
            if (portalIconUrl) {
                addLink.icon = { type: 'url', value: portalIconUrl }
            }

            quickLinks(undefined, {
                addLinks: [addLink],
            })

            item.classList.add('added', 'just-added')
            setTimeout(() => item.classList.remove('just-added'), 400)
        }
    })

    return item
}

// ─── Data helpers ───

function normaliseCategory(entry: CatalogEntry): string {
    if (entry.source === 'cmd') {
        return entry.category || 'Other'
    }

    // msportals: map groupName-style categories to cleaner buckets
    return MSPORTALS_CATEGORY_MAP[entry.category] ?? entry.category
}

function getCategories(): string[] {
    const catSet = new Set<string>()

    for (const entry of catalogEntries) {
        catSet.add(normaliseCategory(entry))
    }

    // Sort based on known order, then alphabetically for the rest
    const ordered: string[] = []
    const known = [
        'Microsoft 365',
        'AI',
        'Azure',
        'Entra',
        'Intune',
        'Defender',
        'XDR Sentinel',
        'Purview',
        'My Pages',
        'General',
        'Developer',
        'Licensing',
        'Health & Status',
        'Partner',
        'Trials',
        'Other',
    ]

    for (const cat of known) {
        if (catSet.has(cat)) {
            ordered.push(cat)
            catSet.delete(cat)
        }
    }

    // Remaining categories alphabetically
    const remaining = Array.from(catSet).sort()
    return [...ordered, ...remaining]
}

interface GroupedEntries {
    category: string
    entries: CatalogEntry[]
}

function getGroupedEntries(tokens: string[]): GroupedEntries[] {
    // Filter entries
    let entries = catalogEntries

    if (tokens.length > 0) {
        entries = entries.filter((entry) => {
            const haystack = `${entry.name} ${entry.description} ${entry.keywords} ${entry.category}`.toLowerCase()
            return tokens.every((token) => haystack.includes(token))
        })
    }

    // Filter by active category
    if (activeCategory !== 'All') {
        entries = entries.filter((entry) => normaliseCategory(entry) === activeCategory)
    }

    // Group by normalised category
    const groups = new Map<string, CatalogEntry[]>()

    for (const entry of entries) {
        const cat = normaliseCategory(entry)
        const list = groups.get(cat)
        if (list) {
            list.push(entry)
        } else {
            groups.set(cat, [entry])
        }
    }

    // Sort groups by known order
    const orderedCategories = getCategories()
    const result: GroupedEntries[] = []

    for (const cat of orderedCategories) {
        const catEntries = groups.get(cat)
        if (catEntries && catEntries.length > 0) {
            // Sort entries within group alphabetically
            catEntries.sort((a, b) => a.name.localeCompare(b.name))
            result.push({ category: cat, entries: catEntries })
        }
    }

    return result
}

function findLinkIdByUrl(data: Record<string, unknown>, url: string): string | undefined {
    for (const val of Object.values(data)) {
        if (isLink(val) && isElem(val) && (val as LinkElem).url === url) {
            return (val as LinkElem)._id
        }
    }
    return undefined
}

function getInitials(name: string): string {
    // Extract uppercase letters from PascalCase/camelCase words (e.g. "PowerApps" -> "PA")
    const uppers = name.replace(/[^a-zA-Z]/g, '').match(/[A-Z]/g)

    if (uppers && uppers.length >= 2) {
        return (uppers[0] + uppers[1]).toUpperCase()
    }

    // Fall back to first letters of space-separated words
    const words = name.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/)

    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
    }

    return (words[0]?.substring(0, 2) ?? '??').toUpperCase()
}

// Deterministic pastel color from a string — same name always gets same color
const PASTEL_HUES = [0, 25, 45, 65, 120, 160, 200, 230, 260, 290, 320, 345]

function getPastelColor(name: string): string {
    let hash = 0

    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }

    const hue = PASTEL_HUES[Math.abs(hash) % PASTEL_HUES.length]
    return `hsl(${hue}, 70%, 80%)`
}
