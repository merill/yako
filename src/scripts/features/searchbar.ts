import { getCatalog } from './catalog/index.ts'
import { getDefaultIcon } from './links/helpers.ts'

import type { CatalogEntry } from '../../types/local.ts'

const MAX_RESULTS = 10

let catalogEntries: CatalogEntry[] = []
let selectedIndex = -1

/**
 * Initialize the searchbar: attach event listeners and load catalog.
 */
export async function searchbar(): Promise<void> {
    const input = document.getElementById('searchbar') as HTMLInputElement | null
    const container = document.getElementById('sb_container')
    const suggestionsList = document.getElementById('sb-suggestions')

    if (!input || !container || !suggestionsList) {
        return
    }

    // Load catalog data
    catalogEntries = await getCatalog()

    input.addEventListener('input', () => onInput(input, container, suggestionsList))
    input.addEventListener('keydown', (event) => onKeydown(event, input, container, suggestionsList))
    input.addEventListener('focus', () => onInput(input, container, suggestionsList))

    document.addEventListener('click', (event) => {
        if (!container.contains(event.target as Node)) {
            hideSuggestions(container, suggestionsList)
            input.setAttribute('aria-expanded', 'false')
        }
    })
}

/**
 * Refresh the cached catalog entries (called after daily refresh).
 */
export async function refreshSearchbarCatalog(): Promise<void> {
    catalogEntries = await getCatalog()
}

function onInput(input: HTMLInputElement, container: HTMLElement, suggestionsList: HTMLElement): void {
    const query = input.value.trim()

    if (query.length === 0) {
        hideSuggestions(container, suggestionsList)
        input.setAttribute('aria-expanded', 'false')
        return
    }

    const results = searchCatalog(query, catalogEntries)
    renderSuggestions(results, container, suggestionsList)
    input.setAttribute('aria-expanded', 'true')
}

function onKeydown(
    event: KeyboardEvent,
    input: HTMLInputElement,
    container: HTMLElement,
    suggestionsList: HTMLElement,
): void {
    const items = suggestionsList.querySelectorAll<HTMLLIElement>('li:not(.no-results)')

    if (event.key === 'ArrowDown') {
        event.preventDefault()
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1)
        updateSelection(items, input)
    }

    if (event.key === 'ArrowUp') {
        event.preventDefault()
        selectedIndex = Math.max(selectedIndex - 1, -1)
        updateSelection(items, input)
    }

    if (event.key === 'Enter') {
        event.preventDefault()

        if (selectedIndex >= 0 && selectedIndex < items.length) {
            const url = items[selectedIndex].dataset.url
            if (url) {
                openPortal(url)
            }
        }
    }

    if (event.key === 'Escape') {
        hideSuggestions(container, suggestionsList)
        input.setAttribute('aria-expanded', 'false')
        input.blur()
    }
}

function updateSelection(items: NodeListOf<HTMLLIElement>, input: HTMLInputElement): void {
    for (const item of items) {
        item.removeAttribute('aria-selected')
    }

    if (selectedIndex >= 0 && selectedIndex < items.length) {
        items[selectedIndex].setAttribute('aria-selected', 'true')
        items[selectedIndex].scrollIntoView({ block: 'nearest' })
        input.setAttribute('aria-activedescendant', items[selectedIndex].id)
    } else {
        input.removeAttribute('aria-activedescendant')
    }
}

/**
 * Simple fuzzy search: splits query into tokens, checks if all tokens
 * appear somewhere in the combined searchable text of an entry.
 * Scores entries by how early and how many tokens match.
 */
function searchCatalog(query: string, entries: CatalogEntry[]): CatalogEntry[] {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)

    if (tokens.length === 0) {
        return []
    }

    const scored: { entry: CatalogEntry; score: number }[] = []

    for (const entry of entries) {
        const haystack = `${entry.name} ${entry.description} ${entry.keywords} ${entry.category}`.toLowerCase()

        let allMatch = true
        let score = 0

        for (const token of tokens) {
            const index = haystack.indexOf(token)

            if (index === -1) {
                allMatch = false
                break
            }

            // Bonus for matching earlier in name
            const nameIndex = entry.name.toLowerCase().indexOf(token)
            if (nameIndex === 0) {
                score += 100
            } else if (nameIndex > 0) {
                score += 50
            }

            // Bonus for matching in category
            if (entry.category.toLowerCase().includes(token)) {
                score += 20
            }

            // Bonus for exact word boundary match
            const wordBoundaryPattern = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
            if (wordBoundaryPattern.test(haystack)) {
                score += 30
            }
        }

        if (allMatch) {
            scored.push({ entry, score })
        }
    }

    scored.sort((a, b) => b.score - a.score)

    return scored.slice(0, MAX_RESULTS).map((s) => s.entry)
}

function renderSuggestions(results: CatalogEntry[], container: HTMLElement, suggestionsList: HTMLElement): void {
    suggestionsList.innerHTML = ''
    selectedIndex = -1

    if (results.length === 0) {
        const noResults = document.createElement('li')
        noResults.className = 'no-results'
        noResults.textContent = 'No portals found'
        suggestionsList.appendChild(noResults)
        suggestionsList.classList.add('shown')
        container.classList.add('has-results')
        return
    }

    for (let i = 0; i < results.length; i++) {
        const entry = results[i]
        const li = document.createElement('li')

        li.id = `sb-suggestion-${i}`
        li.role = 'option'
        li.dataset.url = entry.url
        li.tabIndex = -1

        // Favicon
        const img = document.createElement('img')
        img.src = getDefaultIcon(entry.url)
        img.alt = ''
        img.draggable = false
        img.loading = 'lazy'

        // Text container
        const textDiv = document.createElement('div')
        textDiv.className = 'suggest-text'

        const nameSpan = document.createElement('span')
        nameSpan.className = 'suggest-name'
        nameSpan.textContent = entry.name

        const urlSpan = document.createElement('span')
        urlSpan.className = 'suggest-url'
        urlSpan.textContent = entry.url

        textDiv.appendChild(nameSpan)
        textDiv.appendChild(urlSpan)

        // Category badge
        const categorySpan = document.createElement('span')
        categorySpan.className = 'suggest-category'
        categorySpan.textContent = entry.category

        li.appendChild(img)
        li.appendChild(textDiv)
        li.appendChild(categorySpan)

        li.addEventListener('click', () => openPortal(entry.url))

        li.addEventListener('mouseenter', () => {
            selectedIndex = i
            const items = suggestionsList.querySelectorAll<HTMLLIElement>('li:not(.no-results)')
            for (const item of items) {
                item.removeAttribute('aria-selected')
            }
            li.setAttribute('aria-selected', 'true')
        })

        suggestionsList.appendChild(li)
    }

    suggestionsList.classList.add('shown')
    container.classList.add('has-results')
}

function hideSuggestions(container: HTMLElement, suggestionsList: HTMLElement): void {
    suggestionsList.classList.remove('shown')
    container.classList.remove('has-results')
    selectedIndex = -1
}

function openPortal(url: string): void {
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
    }

    window.open(url, '_blank', 'noopener,noreferrer')
}
