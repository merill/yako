import { storage } from '../storage.ts'

type PopupInit = {
    old?: string
    new: string
    review: number
    announce: 'major' | 'off'
}

type PopupUpdate = {
    announcements?: boolean
}

export function interfacePopup(_init?: PopupInit, event?: PopupUpdate): void {
    if (event?.announcements !== undefined) {
        storage.sync.set({ announcements: event.announcements ? 'major' : 'off' })
        return
    }

    // Announcements and review popups are disabled for My Startup Page
}
