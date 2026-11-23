/**
 * The pace of the migration job on each provider account, as the Providers
 * tab of the operator shows it: the low default, and a faster pace of boat
 * that the operator types and saves. The pace is a setting of the job. A
 * finished job shows only the saved pace, never a typed one. The time of
 * the save is a fact of the page, in `migrationMoments.ts`.
 */
import type { Pace } from '../components/operator/migrationModel'
import type { PaceField } from '../components/operator/PaceFields'
import type { AccountPace } from '../components/operator/PaceRecord'
import type { JobSettings } from './migrationRecord'

/** The low default pace of each account, because the app knows no limit. */
export const defaultPace: Pace = { perHour: 30, atOnce: 3 }

/** The pace that the operator types for boat, and then saves. */
const fasterPace: Pace = { perHour: 60, atOnce: 6 }

/** The saved pace of boat. e2b keeps the default. */
export function savedBoatPace(settings: JobSettings): Pace {
  return settings.savedPace === 'faster' ? fasterPace : defaultPace
}

/** The saved pace of each account, in the ID order of the settings. */
export function savedPaces(settings: JobSettings): readonly AccountPace[] {
  return [
    { id: 'boat', pace: savedBoatPace(settings) },
    { id: 'e2b', pace: defaultPace },
  ]
}

/** The two fields of an account that hold a pace. */
function fieldsOf(id: string, pace: Pace): PaceField {
  return { id, perHour: String(pace.perHour), atOnce: String(pace.atOnce) }
}

/**
 * The fields of the pace: the pace that the operator typed for boat, also
 * after a save that failed, or else the saved pace.
 */
export function paceFields(settings: JobSettings): readonly PaceField[] {
  const boat =
    settings.typedPace === 'none' ? savedBoatPace(settings) : fasterPace
  return [fieldsOf('boat', boat), fieldsOf('e2b', defaultPace)]
}
