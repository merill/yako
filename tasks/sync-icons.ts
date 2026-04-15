import { ensureDirSync, existsSync } from '@std/fs'

// ─── Microsoft Cloud Logos ───

const LOGOS_REPO_URL = 'https://github.com/loryanstrant/MicrosoftCloudLogos'
const LOGOS_BRANCH = 'main'
const LOGOS_TARBALL_URL = `${LOGOS_REPO_URL}/archive/refs/heads/${LOGOS_BRANCH}.tar.gz`
const LOGOS_OUTPUT_DIR = 'website/public/icons/microsoft-cloud-logos'
const LOGOS_MANIFEST_PATH = 'website/public/icons/microsoft-cloud-logos-tree.json'
const IMAGE_EXTENSIONS = ['.png', '.svg']
const SKIP_PREFIXES = ['zzlegacy', '.devcontainer', '.github']

// ─── cmd.ms ───

const CMD_CSV_URL = 'https://raw.githubusercontent.com/merill/cmd/main/website/config/commands.csv'
const CMD_OUTPUT_PATH = 'website/public/data/commands.csv'

// ─── msportals.io ───

const MSPORTALS_BASE = 'https://raw.githubusercontent.com/adamfowlerit/msportals.io/master/_data/portals/'
const MSPORTALS_OUTPUT_DIR = 'website/public/data/portals'
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

// ─── Main ───

async function syncAll(): Promise<void> {
    await Promise.all([
        syncLogos(),
        syncCmdCsv(),
        syncMsPortals(),
    ])
}

// ─── Microsoft Cloud Logos ───

async function syncLogos(): Promise<void> {
    console.log('Downloading MicrosoftCloudLogos archive...')

    const response = await fetch(LOGOS_TARBALL_URL)

    if (!response.ok) {
        throw new Error(`Failed to download logos: ${response.status} ${response.statusText}`)
    }

    // Clean previous output
    if (existsSync(LOGOS_OUTPUT_DIR)) {
        Deno.removeSync(LOGOS_OUTPUT_DIR, { recursive: true })
    }

    ensureDirSync(LOGOS_OUTPUT_DIR)

    // Save tarball to temp file
    const tempTar = await Deno.makeTempFile({ suffix: '.tar.gz' })

    try {
        const bytes = new Uint8Array(await response.arrayBuffer())
        await Deno.writeFile(tempTar, bytes)

        console.log('Extracting images...')

        // Extract tarball using tar command
        const tempDir = await Deno.makeTempDir()

        const extract = new Deno.Command('tar', {
            args: ['-xzf', tempTar, '-C', tempDir],
        })

        const extractResult = extract.outputSync()

        if (!extractResult.success) {
            throw new Error('Failed to extract tarball: ' + new TextDecoder().decode(extractResult.stderr))
        }

        // Find the extracted directory (MicrosoftCloudLogos-main/)
        const extractedEntries = Array.from(Deno.readDirSync(tempDir))
        const repoDir = extractedEntries.find((e) => e.isDirectory)

        if (!repoDir) {
            throw new Error('No directory found in extracted archive')
        }

        const repoPath = `${tempDir}/${repoDir.name}`

        // Walk the extracted repo and copy image files
        const tree: string[] = []

        copyImages(repoPath, '', tree)

        // Generate tree manifest for the icon picker
        const manifest = { generatedAt: new Date().toISOString(), files: tree }
        Deno.writeTextFileSync(LOGOS_MANIFEST_PATH, JSON.stringify(manifest))

        console.log(`Synced ${tree.length} images to ${LOGOS_OUTPUT_DIR}`)
        console.log(`Tree manifest written to ${LOGOS_MANIFEST_PATH}`)

        // Cleanup temp dir
        Deno.removeSync(tempDir, { recursive: true })
    } finally {
        Deno.removeSync(tempTar)
    }
}

function copyImages(basePath: string, relativePath: string, tree: string[]): void {
    const fullPath = relativePath ? `${basePath}/${relativePath}` : basePath

    for (const entry of Deno.readDirSync(fullPath)) {
        const entryRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name

        if (entry.isDirectory) {
            // Skip non-useful directories
            const lowerName = entry.name.toLowerCase()
            if (SKIP_PREFIXES.some((prefix) => lowerName.startsWith(prefix))) {
                continue
            }

            copyImages(basePath, entryRelative, tree)
            continue
        }

        if (!entry.isFile) continue

        // Only copy image files
        const lowerName = entry.name.toLowerCase()
        const isImage = IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
        if (!isImage) continue

        // Copy to output directory preserving relative path
        const destPath = `${LOGOS_OUTPUT_DIR}/${entryRelative}`
        const destDir = destPath.substring(0, destPath.lastIndexOf('/'))

        ensureDirSync(destDir)
        Deno.copyFileSync(`${basePath}/${entryRelative}`, destPath)

        tree.push(entryRelative)
    }
}

// ─── cmd.ms ───

async function syncCmdCsv(): Promise<void> {
    console.log('Downloading cmd.ms commands.csv...')

    const response = await fetch(CMD_CSV_URL)

    if (!response.ok) {
        throw new Error(`Failed to download cmd CSV: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()
    const destDir = CMD_OUTPUT_PATH.substring(0, CMD_OUTPUT_PATH.lastIndexOf('/'))
    ensureDirSync(destDir)
    Deno.writeTextFileSync(CMD_OUTPUT_PATH, text)

    console.log(`Synced cmd.ms CSV to ${CMD_OUTPUT_PATH}`)
}

// ─── msportals.io ───

async function syncMsPortals(): Promise<void> {
    console.log('Downloading msportals.io portal data...')

    if (existsSync(MSPORTALS_OUTPUT_DIR)) {
        Deno.removeSync(MSPORTALS_OUTPUT_DIR, { recursive: true })
    }

    ensureDirSync(MSPORTALS_OUTPUT_DIR)

    let count = 0

    const results = await Promise.allSettled(
        MSPORTALS_FILES.map(async (file) => {
            const response = await fetch(MSPORTALS_BASE + file)

            if (!response.ok) {
                throw new Error(`Failed to download ${file}: ${response.status} ${response.statusText}`)
            }

            const text = await response.text()
            Deno.writeTextFileSync(`${MSPORTALS_OUTPUT_DIR}/${file}`, text)
            return file
        }),
    )

    for (const result of results) {
        if (result.status === 'fulfilled') {
            count++
        } else {
            console.warn(`Failed to sync: ${result.reason}`)
        }
    }

    console.log(`Synced ${count}/${MSPORTALS_FILES.length} msportals.io files to ${MSPORTALS_OUTPUT_DIR}`)
}

await syncAll()
