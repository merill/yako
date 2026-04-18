import { getHTMLTemplate } from '../../shared/dom.ts'
import type { IconPickerEntry as CatalogEntry } from '../../../types/local.ts'

const ICON_BASE_URL = 'https://getyako.com/ms/'
const CATALOG_URL = 'https://getyako.com/ms/catalog.json'

// ─── Types ───

// ─── State ───

let dialog: HTMLDialogElement | null = null
let products: CatalogEntry[] = []
let loaded = false
let activeGroup = 'All'
let onSelectCallback: ((iconUrl: string) => void) | null = null

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
        products = await loadProducts()
        loaded = true
        showLoading(false)
    }

    renderCategoryFilters()
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

    return dlg
}

// ─── Category filter pills ───

function renderCategoryFilters(): void {
    if (!dialog) return

    const filtersEl = dialog.querySelector<HTMLDivElement>('#icon-picker-filters')
    if (!filtersEl) return

    filtersEl.innerHTML = ''

    // "All" pill
    filtersEl.appendChild(createFilterPill('All', products.length, activeGroup === 'All', () => {
        setActiveGroup('All')
    }))

    // One pill per category with its icon count
    for (const g of getGroups()) {
        const count = products.reduce((n, p) => p.group === g ? n + 1 : n, 0)
        filtersEl.appendChild(createFilterPill(g, count, activeGroup === g, () => {
            setActiveGroup(g)
        }))
    }
}

function createFilterPill(label: string, count: number, active: boolean, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'icon-picker-filter' + (active ? ' active' : '')
    btn.dataset.group = label
    btn.setAttribute('aria-pressed', active ? 'true' : 'false')

    const labelEl = document.createElement('span')
    labelEl.textContent = label
    btn.appendChild(labelEl)

    const countEl = document.createElement('span')
    countEl.className = 'icon-picker-filter-count'
    countEl.textContent = String(count)
    btn.appendChild(countEl)

    btn.addEventListener('click', onClick)
    return btn
}

function updateFilterActiveStates(): void {
    if (!dialog) return
    const filtersEl = dialog.querySelector<HTMLDivElement>('#icon-picker-filters')
    if (!filtersEl) return
    for (const btn of filtersEl.querySelectorAll<HTMLButtonElement>('.icon-picker-filter')) {
        const g = btn.dataset.group ?? ''
        const isActive = g === activeGroup
        btn.classList.toggle('active', isActive)
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false')
    }
}

function setActiveGroup(value: string): void {
    if (activeGroup === value) return
    activeGroup = value
    updateFilterActiveStates()
    renderGrid()
}

function getGroups(): string[] {
    const set = new Set<string>()
    for (const p of products) set.add(p.group)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
}

// ─── Data loading ───

async function loadProducts(): Promise<CatalogEntry[]> {
    return await fetchProducts()
}

async function fetchProducts(): Promise<CatalogEntry[]> {
    const response = await fetch(CATALOG_URL)

    if (!response.ok) {
        console.warn('Icon picker: failed to fetch catalog manifest, status', response.status)
        return []
    }

    const data = await response.json()
    return (data.entries ?? []) as CatalogEntry[]
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

    let filtered = products

    if (tokens.length > 0) {
        filtered = filtered.filter((p) => {
            const fams = p.prodfamilies ? p.prodfamilies.join(' ') : ''
            const haystack = `${p.name} ${p.altnames} ${p.group} ${fams}`.toLowerCase()
            return tokens.every((token) => haystack.includes(token))
        })
    }

    if (activeGroup !== 'All') {
        filtered = filtered.filter((p) => p.group === activeGroup)
    }

    if (filtered.length === 0) {
        const noRes = document.createElement('div')
        noRes.className = 'icon-picker-no-results'
        noRes.textContent = 'No icons found.'
        grid.appendChild(noRes)
        return
    }

    const groups = new Map<string, CatalogEntry[]>()

    for (const p of filtered) {
        const list = groups.get(p.group)
        if (list) {
            list.push(p)
        } else {
            groups.set(p.group, [p])
        }
    }

    const orderedGroups = getGroups()

    for (const g of orderedGroups) {
        const groupProducts = groups.get(g)
        if (!groupProducts || groupProducts.length === 0) continue

        groupProducts.sort((a, b) => a.name.localeCompare(b.name))

        const panel = document.createElement('div')
        panel.className = 'icon-picker-group'

        const titleEl = document.createElement('h2')
        titleEl.textContent = g
        panel.appendChild(titleEl)

        const itemsContainer = document.createElement('div')
        itemsContainer.className = 'icon-picker-items'

        for (const product of groupProducts) {
            const item = createIconTile(product)
            itemsContainer.appendChild(item)
        }

        panel.appendChild(itemsContainer)
        grid.appendChild(panel)
    }
}

function createIconTile(product: CatalogEntry): HTMLDivElement {
    const item = document.createElement('div')
    item.className = 'icon-picker-item' + (product.monochrome ? ' monochrome' : '')
    item.title = product.altnames ? `${product.name} (${product.altnames})` : product.name

    const iconUrl = ICON_BASE_URL + encodeURI(product.icon)

    const iconWrap = document.createElement('div')
    iconWrap.className = 'icon-picker-item-icon'

    const img = document.createElement('img')
    img.src = iconUrl
    img.alt = ''
    img.loading = 'lazy'

    iconWrap.appendChild(img)

    const nameEl = document.createElement('span')
    nameEl.className = 'icon-picker-item-name'
    nameEl.textContent = product.name

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
