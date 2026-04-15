import type { Navigator } from '../types/shared.ts'
import type { Local } from '../types/local.ts'
import type { Sync } from '../types/sync.ts'

const navigator = globalThis.navigator as Navigator
const iosUA = 'iPad Simulator|iPhone Simulator|iPod Simulator|iPad|iPhone|iPod'.split('|')
const mobileUA = 'Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini'.split('|')

export const CURRENT_VERSION = '1.0.0'

export const ENVIRONNEMENT: 'PROD' | 'DEV' | 'TEST' = globalThis.ENV ?? 'TEST'

// attributes an ID to this tab to keep track of them
export const TAB_ID = crypto.randomUUID()
export const tabsBc = new BroadcastChannel('mystartuppage_tabs')

export const SYSTEM_OS = iosUA.includes(navigator.platform) ||
        (navigator.userAgent?.includes('Mac') && 'ontouchend' in document)
    ? 'ios'
    : navigator.appVersion?.includes('Macintosh')
    ? 'mac'
    : navigator.appVersion?.includes('Windows')
    ? 'windows'
    : navigator.userAgent?.toLowerCase()?.includes('android')
    ? 'android'
    : 'unknown'

export const PLATFORM = globalThis.location?.protocol === 'moz-extension:'
    ? 'firefox'
    : globalThis.location?.protocol === 'chrome-extension:'
    ? 'chrome'
    : globalThis.location?.protocol === 'safari-web-extension:'
    ? 'safari'
    : 'online'

export const BROWSER = navigator?.userAgentData?.brands.some((b) => b.brand === 'Microsoft Edge')
    ? 'edge'
    : navigator?.userAgentData?.brands.some((b) => b.brand === 'Opera')
    ? 'opera'
    : navigator?.userAgentData?.brands.some((b) => b.brand === 'Chromium')
    ? 'chrome'
    : navigator.userAgent?.toLowerCase()?.indexOf('firefox') > -1
    ? 'firefox'
    : navigator.userAgent?.toLowerCase()?.indexOf('safari') > -1
    ? 'safari'
    : 'other'

export const EXTENSION: typeof chrome | typeof browser | undefined = PLATFORM === 'online'
    ? undefined
    : PLATFORM === 'firefox'
    ? browser
    : chrome

export const IS_MOBILE = navigator.userAgentData
    ? navigator.userAgentData.mobile
    : mobileUA.some((ua) => navigator.userAgent.includes(ua))

const DEFAULT_LANG = 'en'

export const SYNC_DEFAULT: Sync = {
    about: {
        browser: PLATFORM,
        version: CURRENT_VERSION,
    },
    showall: false,
    cmdms: false,
    msportals: false,
    msportalsFavorites: false,
    lang: DEFAULT_LANG,
    dark: 'system',
    favicon: '',
    tabtitle: '',
    greeting: '',
    greetingsize: '3',
    greetingsmode: 'auto',
    pagegap: 1,
    pagewidth: 1600,
    time: true,
    main: true,
    dateformat: 'auto',
    quicklinks: true,
    textShadow: 0.2,
    announcements: 'major',
    review: 0,
    css: '',
    hide: {},
    linkstyle: 'medium',
    linktitles: true,
    linkbackgrounds: false,
    linknewtab: false,
    linksrow: 6,
    linkiconradius: 1.1,
    linkgroups: {
        on: true,
        selected: 'Microsoft 365',
        groups: ['Microsoft 365', 'Admin'],
        pinned: ['Microsoft 365', 'Admin'],
        synced: [],
    },
    backgrounds: {
        type: 'images',
        fadein: 600,
        blur: 15,
        bright: 0.8,
        frequency: 'hour',
        color: '#185A63',
        urls: '',
        images: 'bonjourr-images-daylight',
        videos: 'bonjourr-videos-daylight',
        mute: true,
        queries: {},
        texture: {
            type: 'none',
        },
    },
    clock: {
        size: 1,
        ampm: false,
        analog: false,
        seconds: false,
        ampmlabel: false,
        ampmposition: 'top-left',
        worldclocks: false,
        timezone: 'auto',
    },
    analogstyle: {
        face: 'none',
        hands: 'modern',
        shape: 'round',
        border: '#ffff',
        background: '#fff2',
    },
    worldclocks: [],
    greetingscustom: {
        morning: '',
        afternoon: '',
        evening: '',
        night: '',
    },
    notes: {
        on: false,
        text: '',
        width: 40,
        opacity: 0.1,
        align: 'left',
        background: '#fff2',
    },
    move: {
        selection: 'single',
        layouts: {},
    },

    // Default Microsoft 365 quick links
    linksDefault01: {
        _id: 'linksDefault01',
        order: 0,
        parent: 'Microsoft 365',
        title: 'OneDrive',
        url: 'https://portal.office.com/onedrive',
        icon: {
            type: 'url',
            value: 'https://getyako.com/icons/microsoft-cloud-logos/Microsoft%20365/OneDrive/OneDrive_512.png',
        },
    },
    linksDefault02: {
        _id: 'linksDefault02',
        order: 1,
        parent: 'Microsoft 365',
        title: 'Outlook',
        url: 'https://outlook.cloud.microsoft',
        icon: {
            type: 'url',
            value: 'https://getyako.com/icons/microsoft-cloud-logos/Microsoft%20365/Outlook/Outlook_512.png',
        },
    },
    linksDefault03: {
        _id: 'linksDefault03',
        order: 2,
        parent: 'Microsoft 365',
        title: 'Loop',
        url: 'https://loop.cloud.microsoft',
        icon: {
            type: 'url',
            value: 'https://getyako.com/icons/microsoft-cloud-logos/Microsoft%20365/Loop/Loop%20icon.png',
        },
    },
    linksDefault04: {
        _id: 'linksDefault04',
        order: 3,
        parent: 'Microsoft 365',
        title: 'Copilot',
        url: 'https://copilot.microsoft.com',
        icon: {
            type: 'url',
            value:
                'https://getyako.com/icons/microsoft-cloud-logos/Copilot%20(not%20M365)/Copilot%20(general)%20-%20250x250.png',
        },
    },
    linksDefault05: {
        _id: 'linksDefault05',
        order: 4,
        parent: 'Microsoft 365',
        title: 'Power BI',
        url: 'https://app.powerbi.com',
        icon: {
            type: 'url',
            value:
                'https://getyako.com/icons/microsoft-cloud-logos/Power%20Platform/Power%20BI/Power%20BI%20300x300.png',
        },
    },
    linksDefault06: {
        _id: 'linksDefault06',
        order: 5,
        parent: 'Microsoft 365',
        title: 'To-Do',
        url: 'https://to-do.office.com',
        icon: {
            type: 'url',
            value: 'https://getyako.com/icons/microsoft-cloud-logos/Microsoft%20365/To%20Do/To_Do.png',
        },
    },

    // Default Admin quick links
    linksDefault07: {
        _id: 'linksDefault07',
        order: 0,
        parent: 'Admin',
        title: 'Azure',
        url: 'https://portal.azure.com',
        icon: {
            type: 'url',
            value: 'https://getyako.com/icons/microsoft-cloud-logos/Azure/Azure.png',
        },
    },
    linksDefault08: {
        _id: 'linksDefault08',
        order: 1,
        parent: 'Admin',
        title: 'Entra',
        url: 'https://entra.microsoft.com',
        icon: {
            type: 'url',
            value: 'https://getyako.com/icons/microsoft-cloud-logos/Entra/Microsoft-Entra-ID-color-icon.png',
        },
    },
    linksDefault09: {
        _id: 'linksDefault09',
        order: 3,
        parent: 'Admin',
        title: 'Intune',
        url: 'https://intune.microsoft.com',
        icon: {
            type: 'url',
            value: 'https://getyako.com/icons/microsoft-cloud-logos/other/Intune.png',
        },
    },
    linksDefault10: {
        _id: 'linksDefault10',
        order: 4,
        parent: 'Admin',
        title: 'Security',
        url: 'https://security.microsoft.com',
        icon: {
            type: 'url',
            value: 'https://getyako.com/icons/microsoft-cloud-logos/other/Defender_512.png',
        },
    },
    linksDefault11: {
        _id: 'linksDefault11',
        order: 2,
        parent: 'Admin',
        title: 'Microsoft 365 Admin',
        url: 'https://admin.microsoft.com',
        icon: {
            type: 'url',
            value: 'https://getyako.com/icons/microsoft-cloud-logos/Microsoft%20365/Microsoft%20365%20Admin.png',
        },
    },
}

export const LOCAL_DEFAULT: Local = {
    syncType: PLATFORM === 'online' ? 'off' : 'browser',
    gistToken: '',
    backgroundUrls: {},
    backgroundFiles: {},
    backgroundCollections: {},
    backgroundCompressFiles: true,
    backgroundLastChange: '',
}
