import { storage } from '../storage.ts'
import { BUNDLED_CATEGORIES } from '../../data/bundled-portals.ts'
import type { MsPortalGroup } from '../../types/local.ts'

// --- Constants ---

const GITHUB_BASE = 'https://getyako.com/data/portals/'

const CATEGORY_FILES: Record<string, string> = {
    admin: 'admin.json',
    user: 'user.json',
    thirdparty: 'thirdparty.json',
    edu: 'edu.json',
    'us-govt': 'us-govt.json',
    china: 'china.json',
    training: 'training.json',
    licensing: 'licensing.json',
    consumer: 'consumer.json',
}

const CATEGORY_LABELS: Record<string, string> = {
    admin: 'Admin',
    user: 'End User',
    thirdparty: '3rd Party',
    edu: 'Edu',
    'us-govt': 'US Gov',
    china: 'China',
    training: 'Training',
    licensing: 'Licensing',
    consumer: 'Consumer',
}

const FAVORITES_KEY = 'msportals-favorites'

// --- State ---

let categories: Record<string, MsPortalGroup[]> = {}
let activeCategory = 'admin'
let favorites: string[] = []
let isActive = false
let showFavorites = false

// --- Public API ---

export function msportalsInit(enabled: boolean, favoritesEnabled?: boolean): void {
    if (favoritesEnabled !== undefined) {
        showFavorites = favoritesEnabled
    }

    if (enabled) {
        show()
    }
}

export function msportalsToggle(enabled: boolean): void {
    storage.sync.set({ msportals: enabled })

    if (enabled) {
        show()
    } else {
        hide()
    }
}

export function msportalsSetFavorites(enabled: boolean): void {
    showFavorites = enabled
    storage.sync.set({ msportalsFavorites: enabled })

    // Switch the active view to match the toggle
    if (isActive) {
        setActiveCategory(enabled ? 'favorites' : 'home')
    }
}

// --- Show / Hide ---

function show(): void {
    if (isActive) return
    isActive = true

    const container = document.getElementById('msportals')
    const iface = document.getElementById('interface')
    const showSettings = document.getElementById('show-settings')
    const credit = document.getElementById('credit-container')

    if (!container) return

    container.classList.remove('hidden')
    iface?.classList.add('hidden')
    showSettings?.classList.add('msportals-active')
    credit?.classList.add('hidden')

    loadFavorites()
    loadPortals()
}

function hide(): void {
    if (!isActive) return
    isActive = false

    const container = document.getElementById('msportals')
    const iface = document.getElementById('interface')
    const showSettings = document.getElementById('show-settings')
    const credit = document.getElementById('credit-container')

    container?.classList.add('hidden')
    iface?.classList.remove('hidden')
    showSettings?.classList.remove('msportals-active')
    credit?.classList.remove('hidden')

    if (container) {
        container.innerHTML = ''
    }

    document.removeEventListener('keydown', handleKeydown)
}

// --- Favorites ---

function loadFavorites(): void {
    try {
        const raw = localStorage.getItem(FAVORITES_KEY)
        favorites = raw ? JSON.parse(raw) : []
    } catch {
        favorites = []
    }
}

function saveFavorites(): void {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
}

function toggleFavorite(portalName: string): void {
    const idx = favorites.indexOf(portalName)

    if (idx >= 0) {
        favorites.splice(idx, 1)
    } else {
        favorites.push(portalName)
    }

    saveFavorites()

    // If viewing favorites, re-render
    if (activeCategory === 'favorites') {
        renderContent()
    }
}

function isFavorite(portalName: string): boolean {
    return favorites.includes(portalName)
}

// --- Data Loading ---

async function loadPortals(): Promise<void> {
    // Start with bundled data immediately
    categories = { ...BUNDLED_CATEGORIES }
    buildView()
    renderContent()

    // Try cache for fresher data
    const local = await storage.local.get('msportalsCache')
    const cache = local.msportalsCache

    if (cache && cache.categories && Date.now() - cache.lastFetch < 24 * 60 * 60 * 1000) {
        categories = cache.categories
        renderContent()
        return
    }

    // Fetch fresh data in background
    fetchAllCategories()
}

async function fetchAllCategories(): Promise<void> {
    try {
        const fetched: Record<string, MsPortalGroup[]> = {}

        const results = await Promise.allSettled(
            Object.entries(CATEGORY_FILES).map(async ([key, file]) => {
                const resp = await fetch(GITHUB_BASE + file)

                if (!resp.ok) {
                    throw new Error(`HTTP ${resp.status}`)
                }

                const json = (await resp.json()) as MsPortalGroup[]
                return { key, json }
            }),
        )

        for (const result of results) {
            if (result.status === 'fulfilled') {
                fetched[result.value.key] = result.value.json
            }
        }

        // Only update if we got at least some data
        if (Object.keys(fetched).length > 0) {
            // Merge: keep bundled data for any categories that failed to fetch
            for (const key of Object.keys(CATEGORY_FILES)) {
                if (fetched[key]) {
                    categories[key] = fetched[key]
                }
            }

            storage.local.set({
                msportalsCache: { lastFetch: Date.now(), categories },
            })

            renderContent()
        }
    } catch (err) {
        console.warn('msportals.io: failed to fetch portals', err)
    }
}

// --- DOM Building ---

function buildView(): void {
    const container = document.getElementById('msportals')

    if (!container) return

    container.innerHTML = ''

    // Header
    const header = document.createElement('div')
    header.className = 'msportals-header'

    const headerInner = document.createElement('div')
    headerInner.className = 'msportals-header-inner'

    const title = document.createElement('h1')
    title.className = 'msportals-title'
    title.textContent = 'MSPortals.io - Microsoft Portals'

    const subtitle = document.createElement('h2')
    subtitle.className = 'msportals-subtitle'
    subtitle.textContent = 'A comprehensive directory of all Microsoft portals in one place'

    const counter = document.createElement('div')
    counter.className = 'msportals-counter'
    counter.id = 'msportals-counter'
    counter.textContent = countAllPortals() + ' portals listed'

    // Nav
    const nav = document.createElement('div')
    nav.className = 'msportals-nav'
    nav.id = 'msportals-nav'

    // Home button (show all)
    const homeBtn = createNavBtn('Home', 'home')
    nav.appendChild(homeBtn)

    // Category buttons
    for (const key of Object.keys(CATEGORY_FILES)) {
        const btn = createNavBtn(CATEGORY_LABELS[key], key)
        nav.appendChild(btn)
    }

    // Favorites button
    const favBtn = createNavBtn('\u2764', 'favorites')
    favBtn.classList.add('msportals-nav-btn-fav')
    nav.appendChild(favBtn)

    // GitHub button (external link)
    const ghBtn = document.createElement('a')
    ghBtn.className = 'msportals-nav-btn'
    ghBtn.href = 'https://github.com/adamfowlerit/msportals.io'
    ghBtn.target = '_blank'
    ghBtn.rel = 'noopener noreferrer'
    ghBtn.textContent = 'GitHub'
    nav.appendChild(ghBtn)

    // Quick filter
    const filter = document.createElement('input')
    filter.type = 'text'
    filter.className = 'msportals-filter'
    filter.id = 'msportals-filter'
    filter.placeholder = 'Quick filter...'
    filter.autocomplete = 'off'
    filter.spellcheck = false

    headerInner.appendChild(title)
    headerInner.appendChild(subtitle)
    headerInner.appendChild(counter)
    headerInner.appendChild(nav)
    headerInner.appendChild(filter)
    header.appendChild(headerInner)
    container.appendChild(header)

    // Main content area
    const content = document.createElement('div')
    content.className = 'msportals-content'
    content.id = 'msportals-content'
    container.appendChild(content)

    // Events
    filter.addEventListener('input', () => {
        renderContent()
    })

    document.addEventListener('keydown', handleKeydown)

    // Set default active
    setActiveCategory(showFavorites ? 'favorites' : 'home')

    // Focus filter after a tick
    setTimeout(() => filter.focus(), 50)
}

function createNavBtn(label: string, categoryKey: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'msportals-nav-btn'
    btn.textContent = label
    btn.dataset.category = categoryKey

    if (categoryKey === activeCategory) {
        btn.classList.add('active')
    }

    btn.addEventListener('click', () => {
        setActiveCategory(categoryKey)
    })

    return btn
}

function setActiveCategory(key: string): void {
    activeCategory = key

    // Update nav button active states
    const navBtns = document.querySelectorAll<HTMLButtonElement>('#msportals-nav .msportals-nav-btn')

    for (const btn of navBtns) {
        if (btn.dataset.category === key) {
            btn.classList.add('active')
        } else {
            btn.classList.remove('active')
        }
    }

    renderContent()
}

// --- Rendering ---

function renderContent(): void {
    const content = document.getElementById('msportals-content')

    if (!content) return

    content.innerHTML = ''

    const filter = document.querySelector<HTMLInputElement>('#msportals-filter')
    const query = (filter?.value ?? '').toLowerCase().trim()

    let groups: MsPortalGroup[]

    if (activeCategory === 'favorites') {
        groups = getFavoriteGroups()
    } else if (activeCategory === 'home') {
        // Show all categories combined
        groups = []
        for (const key of Object.keys(CATEGORY_FILES)) {
            const catGroups = categories[key] ?? []
            groups = groups.concat(catGroups)
        }
    } else {
        groups = categories[activeCategory] ?? []
    }

    // Apply filter (only at 2+ chars, matching msportals.io behavior)
    if (query.length >= 2) {
        groups = filterGroups(groups, query)
    }

    if (groups.length === 0 && activeCategory === 'favorites' && query.length < 2) {
        const noResults = document.createElement('div')
        noResults.className = 'msportals-no-results'
        noResults.textContent = 'No favorites yet. Hover over a portal and click the \u2764 to add it.'
        content.appendChild(noResults)
        return
    }

    if (groups.length === 0) {
        const noResults = document.createElement('div')
        noResults.className = 'msportals-no-results'
        noResults.textContent = 'No portals found.'
        content.appendChild(noResults)
        return
    }

    for (const group of groups) {
        const groupEl = document.createElement('div')
        groupEl.className = 'msportals-group'

        const groupTitle = document.createElement('h2')
        groupTitle.className = 'msportals-group-title'
        groupTitle.textContent = group.groupName
        groupEl.appendChild(groupTitle)

        for (const portal of group.portals) {
            const portalEl = createPortalRow(portal)
            groupEl.appendChild(portalEl)
        }

        content.appendChild(groupEl)
    }

    // Update counter
    updateCounter(groups)
}

function createPortalRow(
    portal: { portalName: string; primaryURL: string; secondaryURLs?: { icon: string; url: string }[]; note?: string },
): HTMLElement {
    const row = document.createElement('div')
    row.className = 'msportals-portal'

    // Portal name area
    const nameArea = document.createElement('span')
    nameArea.className = 'msportals-portal-name'

    // Favorite heart
    const heart = document.createElement('span')
    heart.className = 'msportals-portal-add'

    if (isFavorite(portal.portalName)) {
        heart.classList.add('is-fav')
    }

    heart.textContent = '\u2764 '
    heart.addEventListener('click', (e) => {
        e.stopPropagation()
        toggleFavorite(portal.portalName)

        // Update the heart display
        if (isFavorite(portal.portalName)) {
            heart.classList.add('is-fav')
        } else {
            heart.classList.remove('is-fav')
        }
    })
    nameArea.appendChild(heart)

    // Portal name text
    const nameText = document.createElement('span')
    nameText.className = 'msportals-portal-name-text'
    nameText.textContent = portal.portalName
    nameArea.appendChild(nameText)

    // Note (optional)
    if (portal.note) {
        const note = document.createElement('span')
        note.className = 'msportals-portal-note'
        note.textContent = portal.note
        nameArea.appendChild(note)
    }

    row.appendChild(nameArea)

    // Portal details (URL + secondary URLs)
    const details = document.createElement('div')
    details.className = 'msportals-portal-details'

    // Primary URL
    const urlSpan = document.createElement('span')
    urlSpan.className = 'msportals-portal-url'
    const urlLink = document.createElement('a')
    urlLink.href = portal.primaryURL
    urlLink.target = '_self'
    urlLink.rel = 'noopener noreferrer'
    urlLink.textContent = stripProtocol(portal.primaryURL)
    urlLink.addEventListener('click', () => document.documentElement.classList.add('navigating'))
    urlSpan.appendChild(urlLink)
    details.appendChild(urlSpan)

    // Secondary URLs
    if (portal.secondaryURLs && portal.secondaryURLs.length > 0) {
        const secondarySpan = document.createElement('span')
        secondarySpan.className = 'msportals-secondary-urls'

        for (const sec of portal.secondaryURLs) {
            const dot = document.createElement('span')
            dot.className = 'msportals-dot'
            dot.innerHTML = '\u2002\u2022'
            secondarySpan.appendChild(dot)

            const badge = document.createElement('a')
            badge.className = 'msportals-btn-secondary'
            badge.href = sec.url
            badge.target = '_self'
            badge.rel = 'noopener noreferrer'
            badge.textContent = sec.icon
            badge.addEventListener('click', () => document.documentElement.classList.add('navigating'))
            secondarySpan.appendChild(badge)
        }

        details.appendChild(secondarySpan)
    }

    row.appendChild(details)

    return row
}

// --- Filtering ---

function filterGroups(groups: MsPortalGroup[], query: string): MsPortalGroup[] {
    const result: MsPortalGroup[] = []

    for (const group of groups) {
        const matchingPortals = group.portals.filter((p) => {
            const haystack = p.portalName.toLowerCase() +
                ' ' +
                stripProtocol(p.primaryURL).toLowerCase() +
                ' ' +
                (p.note ?? '').toLowerCase() +
                ' ' +
                (p.secondaryURLs ?? []).map((s) => s.icon.toLowerCase() + ' ' + stripProtocol(s.url).toLowerCase())
                    .join(' ')

            return haystack.includes(query)
        })

        if (matchingPortals.length > 0) {
            result.push({ groupName: group.groupName, portals: matchingPortals })
        }
    }

    return result
}

// --- Favorites grouping ---

function getFavoriteGroups(): MsPortalGroup[] {
    if (favorites.length === 0) return []

    const grouped: Record<
        string,
        { portalName: string; primaryURL: string; secondaryURLs?: { icon: string; url: string }[]; note?: string }[]
    > = {}

    for (const key of Object.keys(CATEGORY_FILES)) {
        const catGroups = categories[key] ?? []

        for (const group of catGroups) {
            for (const portal of group.portals) {
                if (favorites.includes(portal.portalName)) {
                    if (!grouped[group.groupName]) {
                        grouped[group.groupName] = []
                    }

                    grouped[group.groupName].push(portal)
                }
            }
        }
    }

    const result: MsPortalGroup[] = []

    for (const [groupName, portals] of Object.entries(grouped)) {
        result.push({ groupName, portals })
    }

    return result
}

// --- Helpers ---

function stripProtocol(url: string): string {
    return url.replace(/^https?:\/\//, '')
}

function countAllPortals(): number {
    let count = 0

    for (const key of Object.keys(CATEGORY_FILES)) {
        const catGroups = categories[key] ?? []

        for (const group of catGroups) {
            count += group.portals.length
        }
    }

    return count
}

function updateCounter(groups: MsPortalGroup[]): void {
    const counter = document.getElementById('msportals-counter')

    if (!counter) return

    let portalCount = 0

    for (const group of groups) {
        portalCount += group.portals.length
    }

    if (activeCategory === 'home' || activeCategory === 'admin') {
        counter.textContent = countAllPortals() + ' portals listed'
    } else {
        counter.textContent = portalCount + ' portals'
    }
}

// --- Event Handlers ---

function handleKeydown(e: KeyboardEvent): void {
    if (!isActive) return

    // Don't intercept when settings is open
    const settings = document.getElementById('settings')
    if (settings?.classList.contains('shown')) return

    if (e.key === 'Escape') {
        const filter = document.querySelector<HTMLInputElement>('#msportals-filter')

        if (filter && filter.value) {
            filter.value = ''
            filter.focus()
            renderContent()
        }

        return
    }

    // / -- focus filter when not already in input
    const tag = (document.activeElement as HTMLElement)?.tagName

    if (
        e.key === '/' &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        tag !== 'INPUT' &&
        tag !== 'TEXTAREA' &&
        tag !== 'SELECT'
    ) {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('#msportals-filter')?.focus()
        return
    }

    // Any printable char -- focus filter
    if (
        e.key.length === 1 &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        tag !== 'INPUT' &&
        tag !== 'TEXTAREA' &&
        tag !== 'SELECT'
    ) {
        document.querySelector<HTMLInputElement>('#msportals-filter')?.focus()
    }
}
