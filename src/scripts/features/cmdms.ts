import { storage } from '../storage.ts'
import type { CmdCommand } from '../../types/local.ts'

// ─── Constants ───

const CMD_CSV_URL = 'https://raw.githubusercontent.com/merill/cmd/main/website/config/commands.csv'

const ASCII_LOGO =
    ` \u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557    \u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557
\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557   \u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255d
\u2588\u2588\u2551     \u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551   \u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557
\u2588\u2588\u2551     \u2588\u2588\u2551\u255a\u2588\u2588\u2554\u255d\u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551   \u2588\u2588\u2551\u255a\u2588\u2588\u2554\u255d\u2588\u2588\u2551\u255a\u2550\u2550\u2550\u2550\u2588\u2588\u2551
\u255a\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551 \u255a\u2550\u255d \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255d\u2588\u2588\u2557\u2588\u2588\u2551 \u255a\u2550\u255d \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551
 \u255a\u2550\u2550\u2550\u2550\u2550\u255d\u255a\u2550\u255d     \u255a\u2550\u255d\u255a\u2550\u2550\u2550\u2550\u2550\u255d \u255a\u2550\u255d\u255a\u2550\u255d     \u255a\u2550\u255d\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u255d`

const COL_CMD = 22
const COL_NAME = 42
const COL_ALIAS = 22
const COL_GAP = '   '

const CATEGORY_ORDER = [
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

const PINNED_COMMANDS = [
    'enpim',
    'en',
    'enusers',
    'engroups',
    'enca',
    'enapps',
    'enappreg',
    'in',
    'indevices',
    'inapps',
    'defender',
    'sp',
    'teams',
]

// ─── State ───

let allCommands: CmdCommand[] = []
let filtered: CmdCommand[] = []
let selectedIdx = 0
let _hoveredIdx = -1
let sortCol: 'command' | 'name' | 'alias' | null = null
let sortDir: 'asc' | 'desc' = 'asc'
let isActive = false

// ─── Public API ───

/**
 * Initialize cmd.ms on page load. Shows/hides the terminal based on the setting.
 */
export function cmdmsInit(enabled: boolean): void {
    if (enabled) {
        show()
    }
}

/**
 * Toggle cmd.ms on/off from the settings panel.
 */
export function cmdmsToggle(enabled: boolean): void {
    storage.sync.set({ cmdms: enabled })

    if (enabled) {
        show()
    } else {
        hide()
    }
}

// ─── Show / Hide ───

function show(): void {
    if (isActive) return
    isActive = true

    const container = document.getElementById('cmdms')
    const iface = document.getElementById('interface')
    const showSettings = document.getElementById('show-settings')
    const credit = document.getElementById('credit-container')

    if (!container) return

    container.classList.remove('hidden')
    iface?.classList.add('hidden')
    showSettings?.classList.add('cmdms-active')
    credit?.classList.add('hidden')

    buildTerminal(container)
    loadCommands()
}

function hide(): void {
    if (!isActive) return
    isActive = false

    const container = document.getElementById('cmdms')
    const iface = document.getElementById('interface')
    const showSettings = document.getElementById('show-settings')
    const credit = document.getElementById('credit-container')

    container?.classList.add('hidden')
    iface?.classList.remove('hidden')
    showSettings?.classList.remove('cmdms-active')
    credit?.classList.remove('hidden')

    if (container) {
        container.innerHTML = ''
    }

    document.removeEventListener('keydown', handleKeydown)
}

// ─── Data Loading ───

async function loadCommands(): Promise<void> {
    // Try cache first
    const local = await storage.local.get('cmdmsCache')
    const cache = local.cmdmsCache

    if (cache && Date.now() - cache.lastFetch < 24 * 60 * 60 * 1000) {
        allCommands = sortCommandList(cache.commands)
        filtered = allCommands
        renderTable()
        return
    }

    // Fetch fresh
    try {
        const resp = await fetch(CMD_CSV_URL)

        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`)
        }

        const text = await resp.text()
        const commands = parseCsv(text)

        storage.local.set({
            cmdmsCache: { lastFetch: Date.now(), commands },
        })

        allCommands = sortCommandList(commands)
        filtered = allCommands
        renderTable()
    } catch (err) {
        console.warn('cmd.ms: failed to fetch commands', err)

        if (cache) {
            allCommands = sortCommandList(cache.commands)
            filtered = allCommands
            renderTable()
        }
    }
}

function parseCsv(text: string): CmdCommand[] {
    const lines = text.split('\n')
    const commands: CmdCommand[] = []

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const fields = parseCsvLine(line)
        if (fields.length < 6) continue

        const [command, alias, description, keywords, category, url] = fields

        if (!url || !description) continue

        commands.push({ command, alias, description, keywords, category, url })
    }

    return commands
}

function parseCsvLine(line: string): string[] {
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

function sortCommandList(commands: CmdCommand[]): CmdCommand[] {
    const pinSet = new Set(PINNED_COMMANDS)
    const pinOrder: Record<string, number> = {}
    const catOrder: Record<string, number> = {}

    for (let i = 0; i < PINNED_COMMANDS.length; i++) {
        pinOrder[PINNED_COMMANDS[i]] = i
    }
    for (let i = 0; i < CATEGORY_ORDER.length; i++) {
        catOrder[CATEGORY_ORDER[i]] = i
    }

    const pinned: CmdCommand[] = []
    const rest: CmdCommand[] = []

    for (const cmd of commands) {
        if (pinSet.has(cmd.command)) {
            pinned.push(cmd)
        } else {
            rest.push(cmd)
        }
    }

    pinned.sort((a, b) => pinOrder[a.command] - pinOrder[b.command])
    rest.sort((a, b) => {
        const ca = catOrder[a.category] ?? 999
        const cb = catOrder[b.category] ?? 999
        if (ca !== cb) return ca - cb
        return a.description.localeCompare(b.description)
    })

    return [...pinned, ...rest]
}

// ─── Filtering & Sorting ───

function applyFilterAndSort(): void {
    const input = document.querySelector<HTMLInputElement>('#cmdms-search')
    const q = (input?.value ?? '').toLowerCase().trim()

    let list = allCommands

    if (q) {
        list = list.filter(
            (c) =>
                c.command.toLowerCase().includes(q) ||
                c.description.toLowerCase().includes(q) ||
                (c.alias && c.alias.toLowerCase().includes(q)) ||
                (c.keywords && c.keywords.toLowerCase().includes(q)) ||
                (c.category && c.category.toLowerCase().includes(q)),
        )
    }

    if (sortCol) {
        const key = sortCol === 'command' ? 'command' : sortCol === 'name' ? 'description' : 'alias'
        list = [...list].sort((a, b) => {
            const va = (a[key] || '').toLowerCase()
            const vb = (b[key] || '').toLowerCase()
            const cmp = va.localeCompare(vb)
            return sortDir === 'asc' ? cmp : -cmp
        })
    }

    filtered = list
    selectedIdx = 0
    renderTable()
}

function toggleSort(col: 'command' | 'name' | 'alias'): void {
    if (sortCol === col) {
        if (sortDir === 'asc') {
            sortDir = 'desc'
        } else {
            sortCol = null
            sortDir = 'asc'
        }
    } else {
        sortCol = col
        sortDir = 'asc'
    }

    applyFilterAndSort()
    renderHeader()
}

function sortIndicator(col: string): string {
    if (sortCol !== col) return ' \u00b7'
    return sortDir === 'asc' ? ' \u25b2' : ' \u25bc'
}

// ─── Helpers ───

function pad(str: string, len: number): string {
    if (!str) str = ''
    if (str.length > len) str = str.slice(0, len - 1) + '\u2026'
    return str + ' '.repeat(Math.max(0, len - str.length))
}

// ─── DOM Building ───

function buildTerminal(container: HTMLElement): void {
    container.innerHTML = ''

    // Logo
    const logo = document.createElement('pre')
    logo.className = 'cmdms-logo'
    logo.textContent = ASCII_LOGO
    container.appendChild(logo)

    // Subtitle
    const subtitle = document.createElement('div')
    subtitle.className = 'cmdms-subtitle'
    subtitle.textContent = 'The Microsoft Cloud command line'
    container.appendChild(subtitle)

    // Tagline
    const tagline = document.createElement('div')
    tagline.className = 'cmdms-tagline'
    tagline.textContent =
        'Type a command to jump to any Microsoft portal \u2014 or use [command].cmd.ms in your browser address bar.'
    container.appendChild(tagline)

    // Search area
    const searchArea = document.createElement('div')
    searchArea.className = 'cmdms-search-area'

    const prefix = document.createElement('span')
    prefix.className = 'cmdms-search-prefix'
    prefix.textContent = 'C:\\cmd.ms>'

    const inputWrap = document.createElement('div')
    inputWrap.className = 'cmdms-search-input-wrap'

    const input = document.createElement('input')
    input.type = 'text'
    input.id = 'cmdms-search'
    input.className = 'cmdms-search-input'
    input.placeholder = 'Search commands...'
    input.autocomplete = 'off'
    input.spellcheck = false

    const cursor = document.createElement('span')
    cursor.className = 'cmdms-block-cursor'

    inputWrap.appendChild(input)
    inputWrap.appendChild(cursor)
    searchArea.appendChild(prefix)
    searchArea.appendChild(inputWrap)
    container.appendChild(searchArea)

    // Result count
    const resultCount = document.createElement('div')
    resultCount.id = 'cmdms-result-count'
    resultCount.className = 'cmdms-result-count'
    container.appendChild(resultCount)

    // Table container
    const tableContainer = document.createElement('div')
    tableContainer.className = 'cmdms-table-container'

    // Header
    const header = document.createElement('div')
    header.id = 'cmdms-table-header'
    header.className = 'cmdms-table-header'
    tableContainer.appendChild(header)

    // Separator
    const sep = document.createElement('div')
    sep.className = 'cmdms-table-separator'
    sep.textContent = ' ' + '\u2500'.repeat(COL_CMD) + COL_GAP + '\u2500'.repeat(COL_NAME) + COL_GAP +
        '\u2500'.repeat(COL_ALIAS)
    tableContainer.appendChild(sep)

    // Rows
    const rows = document.createElement('div')
    rows.id = 'cmdms-rows'
    tableContainer.appendChild(rows)

    container.appendChild(tableContainer)

    // Footer
    const footer = document.createElement('div')
    footer.className = 'cmdms-footer'
    footer.innerHTML = '<div class="cmdms-footer-left">' +
        '<span><kbd>\u2191\u2193</kbd> Navigate</span>' +
        '<span><kbd>Enter</kbd> Open</span>' +
        '<span><kbd>/</kbd> Search</span>' +
        '<span><kbd>Esc</kbd> Clear</span>' +
        '</div>' +
        '<div class="cmdms-footer-right">Made in \ud83e\udd98 Australia with \u2764\ufe0f</div>'
    container.appendChild(footer)

    // Events
    input.addEventListener('input', () => {
        cursor.style.left = `${input.value.length}ch`
        applyFilterAndSort()
    })

    document.addEventListener('keydown', handleKeydown)

    renderHeader()

    // Focus after a tick so it doesn't conflict with settings
    setTimeout(() => input.focus(), 50)
}

function renderHeader(): void {
    const header = document.getElementById('cmdms-table-header')
    if (!header) return

    header.innerHTML = ''

    const cols: { col: 'command' | 'name' | 'alias'; label: string; width: number }[] = [
        { col: 'command', label: 'COMMAND', width: COL_CMD },
        { col: 'name', label: 'NAME', width: COL_NAME },
        { col: 'alias', label: 'ALIAS', width: COL_ALIAS },
    ]

    let first = true

    for (const { col, label, width } of cols) {
        if (!first) {
            const gap = document.createElement('span')
            gap.textContent = COL_GAP + ' '
            header.appendChild(gap)
        }

        const span = document.createElement('span')
        span.className = 'cmdms-sortable'
        span.textContent = (first ? ' ' : '') + pad(label + sortIndicator(col), width)
        span.addEventListener('click', () => toggleSort(col))
        header.appendChild(span)
        first = false
    }
}

function renderTable(): void {
    const rows = document.getElementById('cmdms-rows')
    const resultCount = document.getElementById('cmdms-result-count')

    if (!rows) return

    // Result count
    if (resultCount) {
        const input = document.querySelector<HTMLInputElement>('#cmdms-search')
        const q = input?.value ?? ''
        let text = `${filtered.length} command${filtered.length !== 1 ? 's' : ''} found`
        if (q) {
            text += ` matching "${q}"`
        }
        resultCount.textContent = text
    }

    rows.innerHTML = ''

    if (filtered.length === 0) {
        const noResults = document.createElement('div')
        noResults.className = 'cmdms-no-results'
        noResults.innerHTML = '<div>Command not found.</div>' +
            '<div class="cmdms-no-results-sub">' +
            'Want to add a new command to cmd.ms? ' +
            '<a href="https://cmd.ms/docs/docs/contributing" target="_blank" rel="noopener noreferrer" class="cmdms-link">Learn how to contribute \u2192</a>' +
            '</div>'
        rows.appendChild(noResults)
        return
    }

    for (let i = 0; i < filtered.length; i++) {
        const cmd = filtered[i]
        const row = document.createElement('div')
        row.className = 'cmdms-table-row'

        if (i === selectedIdx) {
            row.classList.add('cmdms-row-selected')
        }

        row.dataset.index = String(i)

        const colCmd = document.createElement('span')
        colCmd.className = 'cmdms-col-cmd'
        colCmd.textContent = ' ' + pad(cmd.command + '.cmd.ms', COL_CMD)

        const gap1 = document.createElement('span')
        gap1.className = 'cmdms-col-gap'
        gap1.textContent = COL_GAP

        const colName = document.createElement('span')
        colName.className = 'cmdms-col-name'
        colName.textContent = pad(cmd.description, COL_NAME)

        const gap2 = document.createElement('span')
        gap2.className = 'cmdms-col-gap'
        gap2.textContent = COL_GAP

        const colAlias = document.createElement('span')
        colAlias.className = 'cmdms-col-alias'
        colAlias.textContent = pad(cmd.alias || '', COL_ALIAS)

        row.appendChild(colCmd)
        row.appendChild(gap1)
        row.appendChild(colName)
        row.appendChild(gap2)
        row.appendChild(colAlias)

        row.addEventListener('click', () => handleRowClick(i))
        row.addEventListener('mouseenter', () => {
            _hoveredIdx = i
            row.classList.add('cmdms-row-hover')
        })
        row.addEventListener('mouseleave', () => {
            _hoveredIdx = -1
            row.classList.remove('cmdms-row-hover')
        })

        rows.appendChild(row)
    }
}

function updateSelection(prevIdx: number, nextIdx: number): void {
    const rows = document.getElementById('cmdms-rows')
    if (!rows) return

    const prevRow = rows.children[prevIdx] as HTMLElement | undefined
    const nextRow = rows.children[nextIdx] as HTMLElement | undefined

    prevRow?.classList.remove('cmdms-row-selected')
    nextRow?.classList.add('cmdms-row-selected')

    nextRow?.scrollIntoView({ block: 'nearest' })
}

// ─── Event Handlers ───

function handleRowClick(idx: number): void {
    selectedIdx = idx
    const url = filtered[idx]?.url
    if (url) {
        globalThis.open(url, '_blank', 'noopener,noreferrer')
    }
}

function handleKeydown(e: KeyboardEvent): void {
    if (!isActive) return

    // Don't intercept when settings is open and focus is in settings
    const settings = document.getElementById('settings')
    if (settings?.classList.contains('shown')) return

    if (e.key === 'Escape') {
        const input = document.querySelector<HTMLInputElement>('#cmdms-search')
        if (input && input.value) {
            input.value = ''
            input.focus()
            applyFilterAndSort()
            const cursor = document.querySelector<HTMLElement>('.cmdms-block-cursor')
            if (cursor) cursor.style.left = '0ch'
        }
        return
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault()
        const prevIdx = selectedIdx
        selectedIdx = Math.min(selectedIdx + 1, filtered.length - 1)
        updateSelection(prevIdx, selectedIdx)
        return
    }

    if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIdx = selectedIdx
        if (selectedIdx <= 0) {
            document.querySelector<HTMLInputElement>('#cmdms-search')?.focus()
        } else {
            selectedIdx = selectedIdx - 1
        }
        updateSelection(prevIdx, selectedIdx)
        return
    }

    if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIdx >= 0 && selectedIdx < filtered.length) {
            const url = filtered[selectedIdx].url
            if (url) globalThis.open(url, '_blank', 'noopener,noreferrer')
        }
        return
    }

    // / — focus search when not already in input
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
        document.querySelector<HTMLInputElement>('#cmdms-search')?.focus()
        return
    }

    // Any printable char — focus input
    if (
        e.key.length === 1 &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        tag !== 'INPUT' &&
        tag !== 'TEXTAREA' &&
        tag !== 'SELECT'
    ) {
        document.querySelector<HTMLInputElement>('#cmdms-search')?.focus()
    }
}
