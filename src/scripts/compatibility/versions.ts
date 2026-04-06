import * as filter from './filters.ts'
import type { Sync } from '../../types/sync.ts'
import type { SemVer } from '../utils/semver.ts'

export function filterByVersion(data: Partial<Sync>, version: SemVer): Partial<Sync> {
    const { major, minor } = version

    if (major < 22) {
        data = filter.newLinkIcons(data)
    }

    if (major <= 21) {
        if (minor < 3) {
            data = filter.fixNullBrightness(data)
        }
    }

    if (major < 21) {
        data = filter.newBackgroundsField(data)
        data = filter.manualTimezonesToIntl(data)
    }

    if (major < 20) {
        data = filter.analogClockOptions(data)
        data = filter.validateLinkGroups(data)
        data = filter.toIsoLanguageCode(data)
    }

    if (major < 19) {
        data = filter.newReviewData(data)
        data = filter.linksDataMigration(data)
    }

    if (major < 18) {
        data = filter.linkListToFlatObjects(data)
        data = filter.hideArrayToObject(data)
        data = filter.clockDateFormat(data)
    }

    return data
}
