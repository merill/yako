export async function setTranslationCache(_language: string, _local?: unknown): Promise<void> {
    // English only, no translation cache needed
}

export function traduction(_scope: Element | null, _lang = 'en'): void {
    // English only, no translation needed
}

export async function toggleTraduction(_lang: string): Promise<void> {
    // English only, no translation toggle needed
}

export function getLang(): string {
    return 'en'
}

export function tradThis(str: string): string {
    return str
}

export function countryCodeToLanguageCode(_lang: string): string {
    return 'en'
}
