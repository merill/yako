import { getHTMLTemplate } from '../../shared/dom.ts'

const ICON_BASE_URL = 'https://getyako.com/icons/microsoft-cloud-logos/'
const TREE_MANIFEST_URL = 'https://getyako.com/icons/microsoft-cloud-logos-tree.json'
const CACHE_KEY = 'icon-picker-tree-v3'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

// ─── Types ───

interface IconEntry {
    path: string
    name: string
    category: string
}

interface TreeCache {
    timestamp: number
    entries: IconEntry[]
}

// ─── State ───

let dialog: HTMLDialogElement | null = null
let iconEntries: IconEntry[] = []
let loaded = false
let activeCategory = 'All'
let onSelectCallback: ((iconUrl: string) => void) | null = null

// ─── Category ordering ───

const CATEGORY_ORDER = [
    'Microsoft 365',
    'Azure',
    'Entra',
    'Power Platform',
    'Dynamics 365',
    'Viva',
    'Fabric',
    'Copilot',
    'other',
]

// ─── Public API ───

export async function openIconPicker(onSelect: (iconUrl: string) => void): Promise<void> {
    onSelectCallback = onSelect

    if (!dialog) {
        dialog = createDialog()
    }

    document.body.appendChild(dialog)
    dialog.showModal()

    requestAnimationFrame(() => {
        dialog!.classList.add('shown')
    })

    if (!loaded) {
        showLoading(true)
        iconEntries = await loadIconTree()
        loaded = true
        showLoading(false)
    }

    populateCategoryDropdown()
    renderGrid()

    const search = dialog.querySelector<HTMLInputElement>('#icon-picker-search')
    setTimeout(() => search?.focus(), 50)
}

export function closeIconPicker(): void {
    if (!dialog) return

    dialog.classList.remove('shown')

    setTimeout(() => {
        dialog?.close()
        dialog?.remove()
    }, 350)
}

function showLoading(visible: boolean): void {
    if (!dialog) return
    const el = dialog.querySelector<HTMLDivElement>('#icon-picker-loading')
    if (el) {
        el.style.display = visible ? '' : 'none'
    }
}

// ─── Dialog creation ───

function createDialog(): HTMLDialogElement {
    const dlg = getHTMLTemplate<HTMLDialogElement>('icon-picker-template', 'dialog')

    const closeBtn = dlg.querySelector<HTMLButtonElement>('#icon-picker-close')
    closeBtn?.addEventListener('click', closeIconPicker)

    dlg.addEventListener('click', (event) => {
        if (event.target === dlg) {
            closeIconPicker()
        }
    })

    dlg.addEventListener('cancel', (event) => {
        event.preventDefault()
        closeIconPicker()
    })

    const search = dlg.querySelector<HTMLInputElement>('#icon-picker-search')
    search?.addEventListener('input', () => {
        renderGrid()
    })

    const select = dlg.querySelector<HTMLSelectElement>('#icon-picker-category')
    select?.addEventListener('change', () => {
        activeCategory = select.value
        renderGrid()
    })

    return dlg
}

// ─── Data loading ───

async function loadIconTree(): Promise<IconEntry[]> {
    // Check localStorage cache
    const cached = readCache()
    if (cached) return cached

    const entries = await fetchIconTree()
    writeCache(entries)
    return entries
}

async function fetchIconTree(): Promise<IconEntry[]> {
    const response = await fetch(TREE_MANIFEST_URL)

    if (!response.ok) {
        console.warn('Icon picker: failed to fetch tree manifest, status', response.status)
        return []
    }

    const data = await response.json()
    const files = data.files as string[]
    const all: IconEntry[] = []

    for (const filePath of files) {
        const lower = filePath.toLowerCase()
        if (!lower.endsWith('.png') && !lower.endsWith('.svg')) continue

        // Skip legacy/devcontainer/github files
        if (lower.startsWith('zzlegacy') || lower.startsWith('.')) continue

        const category = extractCategory(filePath)
        const name = extractName(filePath)

        all.push({ path: filePath, name, category })
    }

    return deduplicateIcons(all)
}

function extractCategory(path: string): string {
    const firstSlash = path.indexOf('/')
    if (firstSlash === -1) return 'other'
    const topDir = path.substring(0, firstSlash)

    if (topDir === 'Copilot (not M365)') return 'Copilot'
    return topDir
}

function extractName(path: string): string {
    const parts = path.split('/')
    let filename = parts[parts.length - 1]

    // Remove file extension
    filename = filename.replace(/\.(png|svg)$/i, '')

    // Remove size suffixes like _256x256, _128x128, _512, etc.
    filename = filename.replace(/[_ ]\d+x\d+/g, '')
    filename = filename.replace(/[_ ]\d{2,}$/g, '')

    // Remove parenthetical notes like "(2025 unofficial)", "(general)"
    filename = filename.replace(/\s*\([^)]*\)\s*/g, ' ')

    // Remove Azure icon prefixes like "10166-icon-service-"
    filename = filename.replace(/^\d+-icon-service-/i, '')

    // Replace hyphens/underscores with spaces
    filename = filename.replace(/[-_]/g, ' ')

    // Clean up multiple spaces
    filename = filename.replace(/\s+/g, ' ').trim()

    return filename || parts[parts.length - 1]
}

function deduplicateIcons(entries: IconEntry[]): IconEntry[] {
    // Group entries by a normalised dedup key (lowercase name + category)
    const groups = new Map<string, IconEntry[]>()

    for (const entry of entries) {
        const key = `${entry.category}::${entry.name.toLowerCase()}`
        const list = groups.get(key)
        if (list) {
            list.push(entry)
        } else {
            groups.set(key, [entry])
        }
    }

    // Pick the best variant from each group
    const result: IconEntry[] = []

    for (const variants of groups.values()) {
        if (variants.length === 1) {
            result.push(variants[0])
            continue
        }

        // Score each variant: prefer 256x256 PNG > scalable PNG > SVG > other PNGs
        let best = variants[0]
        let bestScore = variantScore(best.path)

        for (let i = 1; i < variants.length; i++) {
            const score = variantScore(variants[i].path)
            if (score > bestScore) {
                best = variants[i]
                bestScore = score
            }
        }

        result.push(best)
    }

    return result
}

function variantScore(path: string): number {
    const lower = path.toLowerCase()

    // Penalise "padded" variants (they have large transparent borders)
    const padded = lower.includes('padded') ? -50 : 0

    // Penalise subdirectory variants (they tend to have internal padding)
    const depth = (path.match(/\//g) || []).length
    const subdirPenalty = depth > 2 ? -20 : 0

    if (lower.includes('512')) return 100 + padded + subdirPenalty
    if (lower.includes('300x300')) return 95 + padded + subdirPenalty
    if (lower.includes('256x256')) return 90 + padded + subdirPenalty
    if (lower.includes('scalable')) return 85 + padded + subdirPenalty
    if (lower.includes('128x128') || lower.includes('128')) return 70 + padded + subdirPenalty
    if (lower.endsWith('.svg')) return 65 + padded + subdirPenalty
    if (lower.includes('64x64') || lower.includes('64')) return 50 + padded + subdirPenalty

    // Any other image
    return 40 + padded + subdirPenalty
}

function readCache(): IconEntry[] | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (!raw) return null
        const cache: TreeCache = JSON.parse(raw)
        if (Date.now() - cache.timestamp > CACHE_TTL_MS) return null
        return cache.entries
    } catch {
        return null
    }
}

function writeCache(entries: IconEntry[]): void {
    try {
        const cache: TreeCache = { timestamp: Date.now(), entries }
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    } catch {
        // Storage full or unavailable — ignore
    }
}

// ─── Category dropdown ───

function populateCategoryDropdown(): void {
    if (!dialog) return

    const select = dialog.querySelector<HTMLSelectElement>('#icon-picker-category')
    if (!select) return

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

function getCategories(): string[] {
    const catSet = new Set<string>()

    for (const entry of iconEntries) {
        catSet.add(entry.category)
    }

    const ordered: string[] = []

    for (const cat of CATEGORY_ORDER) {
        if (catSet.has(cat)) {
            ordered.push(cat)
            catSet.delete(cat)
        }
    }

    const remaining = Array.from(catSet).sort()
    return [...ordered, ...remaining]
}

// ─── Rendering ───

function renderGrid(): void {
    if (!dialog) return

    const grid = dialog.querySelector<HTMLDivElement>('#icon-picker-grid')
    if (!grid) return

    grid.innerHTML = ''

    const search = dialog.querySelector<HTMLInputElement>('#icon-picker-search')
    const query = (search?.value ?? '').toLowerCase().trim()
    const tokens = query ? query.split(/\s+/).filter(Boolean) : []

    // Filter
    let filtered = iconEntries

    if (tokens.length > 0) {
        filtered = filtered.filter((entry) => {
            const haystack = `${entry.name} ${entry.path} ${entry.category}`.toLowerCase()
            return tokens.every((token) => haystack.includes(token))
        })
    }

    if (activeCategory !== 'All') {
        filtered = filtered.filter((entry) => entry.category === activeCategory)
    }

    if (filtered.length === 0) {
        const noRes = document.createElement('div')
        noRes.className = 'icon-picker-no-results'
        noRes.textContent = 'No icons found.'
        grid.appendChild(noRes)
        return
    }

    // Group by category
    const groups = new Map<string, IconEntry[]>()

    for (const entry of filtered) {
        const list = groups.get(entry.category)
        if (list) {
            list.push(entry)
        } else {
            groups.set(entry.category, [entry])
        }
    }

    const orderedCategories = getCategories()

    for (const cat of orderedCategories) {
        const catEntries = groups.get(cat)
        if (!catEntries || catEntries.length === 0) continue

        catEntries.sort((a, b) => a.name.localeCompare(b.name))

        const panel = document.createElement('div')
        panel.className = 'icon-picker-group'

        const titleEl = document.createElement('h2')
        titleEl.textContent = cat
        panel.appendChild(titleEl)

        const itemsContainer = document.createElement('div')
        itemsContainer.className = 'icon-picker-items'

        for (const entry of catEntries) {
            const item = createIconTile(entry)
            itemsContainer.appendChild(item)
        }

        panel.appendChild(itemsContainer)
        grid.appendChild(panel)
    }
}

function createIconTile(entry: IconEntry): HTMLDivElement {
    const item = document.createElement('div')
    item.className = 'icon-picker-item'
    item.title = entry.path

    const iconUrl = ICON_BASE_URL + encodeURI(entry.path)

    const iconWrap = document.createElement('div')
    iconWrap.className = 'icon-picker-item-icon'

    const img = document.createElement('img')
    img.src = iconUrl
    img.alt = ''
    img.loading = 'lazy'

    iconWrap.appendChild(img)

    const nameEl = document.createElement('span')
    nameEl.className = 'icon-picker-item-name'
    nameEl.textContent = entry.name

    item.appendChild(iconWrap)
    item.appendChild(nameEl)

    item.addEventListener('click', () => {
        if (onSelectCallback) {
            onSelectCallback(iconUrl)
        }
        closeIconPicker()
    })

    return item
}
