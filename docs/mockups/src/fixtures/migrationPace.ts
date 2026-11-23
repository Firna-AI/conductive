/**
 * The pace of the migration job on each provider account, as the Providers
 * tab of the operator shows it: the low default, and a faster pace of boat
 * that the operator types and saves. A finished job shows only the saved
 * pace, never a typed one.
 */
import type { Pace } from '../components/operator/migrationModel'
import type { PaceField } from '../components/operator/PaceFields'
import type { AccountPace } from '../components/operator/PaceRecord'
import type { JobRecord } from './migrationRecord'

/** The low default pace of each account, because the app knows no limit. */
export const defaultPace: Pace = { perHour: 30, atOnce: 3 }

/** The pace that the operator types for boat, and then saves. */
const fasterPace: Pace = { perHour: 60, atOnce: 6 }

/** The saved pace of boat. e2b keeps the default. */
export function savedBoatPace(record: JobRecord): Pace {
  return record.savedPace === 'faster' ? fasterPace : defaultPace
}

/** The saved pace of each account, in the ID order of the settings. */
export function savedPaces(record: JobRecord): readonly AccountPace[] {
  return [
    { id: 'boat', pace: savedBoatPace(record) },
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
export function paceFields(record: JobRecord): readonly PaceField[] {
  const boat = record.typedPace === 'none' ? savedBoatPace(record) : fasterPace
  return [fieldsOf('boat', boat), fieldsOf('e2b', defaultPace)]
}

/** When the operator saved the faster pace of boat. */
export const paceSavedAt = '24 Nov at 11:46'
