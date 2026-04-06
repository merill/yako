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
    linkbackgrounds: true,
    linknewtab: false,
    linksrow: 6,
    linkiconradius: 1.1,
    linkgroups: {
        on: false,
        selected: 'default',
        groups: ['default'],
        pinned: [],
        synced: [],
    },
    backgrounds: {
        type: 'color',
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

    // Default Microsoft admin portal quick links
    linksDefault01: {
        _id: 'linksDefault01',
        order: 0,
        parent: 'default',
        title: 'Entra Admin Center',
        url: 'https://entra.microsoft.com',
    },
    linksDefault02: {
        _id: 'linksDefault02',
        order: 1,
        parent: 'default',
        title: 'Intune',
        url: 'https://intune.microsoft.com',
    },
    linksDefault03: {
        _id: 'linksDefault03',
        order: 2,
        parent: 'default',
        title: 'Microsoft 365 Admin',
        url: 'https://admin.microsoft.com',
    },
    linksDefault04: {
        _id: 'linksDefault04',
        order: 3,
        parent: 'default',
        title: 'Azure Portal',
        url: 'https://portal.azure.com',
    },
    linksDefault05: {
        _id: 'linksDefault05',
        order: 4,
        parent: 'default',
        title: 'Microsoft Defender',
        url: 'https://security.microsoft.com',
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
