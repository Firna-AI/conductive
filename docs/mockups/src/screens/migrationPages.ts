import { jobRecordValues, type JobRecord } from '../fixtures/migrationRecord'
import { pageWithProps } from '../pageLookup'
import { migrationPaths } from '../paths'

/** The state of a page of the migration job, as one prop of the Providers tab. */
export const jobRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['progress', 'run', 'limit', 'savedPace', 'typedPace'],
  properties: {
    progress: { enum: jobRecordValues.progress },
    run: { enum: jobRecordValues.run },
    limit: { enum: jobRecordValues.limit },
    savedPace: { enum: jobRecordValues.savedPace },
    typedPace: { enum: jobRecordValues.typedPace },
  },
} as const

/** The later job on every org, at the default pace: the canonical page. */
const running: JobRecord = {
  progress: 'later',
  run: 'running',
  limit: 'none',
  savedPace: 'default',
  typedPace: 'none',
}

/** A pause of the later job, which keeps the other parts. */
const paused: JobRecord = { ...running, run: 'paused' }

/** The path of a page of the migration job. */
type MigrationPath = (typeof migrationPaths)[keyof typeof migrationPaths]

/**
 * Each page of the migration job, by its path, with its state. Each path
 * has one, so a new page needs its state here. The entries read their
 * props here, and each control of the job finds its page here.
 */
export const migrationPages: Readonly<Record<MigrationPath, JobRecord>> = {
  [migrationPaths.running]: running,
  [migrationPaths.counted]: { ...running, progress: 'counted' },
  [migrationPaths.counting]: { ...running, progress: 'counting' },
  [migrationPaths.paused]: paused,
  [migrationPaths.pausedLimited]: { ...paused, limit: 'hexwave' },
  [migrationPaths.pausedLimit]: { ...paused, limit: 'question' },
  [migrationPaths.pausedPace]: { ...paused, savedPace: 'faster' },
  [migrationPaths.refused]: { ...running, run: 'refused' },
  [migrationPaths.capacity]: { ...running, run: 'capacity' },
  [migrationPaths.limit]: { ...running, limit: 'question' },
  [migrationPaths.limited]: { ...running, limit: 'hexwave' },
  [migrationPaths.limitedDone]: { ...running, limit: 'hexwave-done' },
  [migrationPaths.pace]: { ...running, typedPace: 'faster' },
  [migrationPaths.paceSaved]: { ...running, savedPace: 'faster' },
  [migrationPaths.paceNotSaved]: { ...running, typedPace: 'save-failed' },
  [migrationPaths.done]: { ...running, run: 'done' },
}

/** The path of the page that draws a state of the job, or none. */
export function migrationPageOf(record: JobRecord): string | undefined {
  return pageWithProps(migrationPages, record)
}

/**
 * The props of the Providers tab on a page of the job: the default
 * weights, both accounts, open sign-ups, and the state of that page.
 */
export function migrationProps(path: MigrationPath) {
  return {
    weights: 'default',
    accounts: 'both',
    signUps: 'open',
    job: migrationPages[path],
  } as const
}
