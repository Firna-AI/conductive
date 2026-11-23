import { pageFacts } from '../fixtures/migrationMoments'
import {
  jobFactValues,
  jobSettingValues,
  type JobFacts,
  type JobRecord,
  type JobSettings,
} from '../fixtures/migrationRecord'
import { pageWithProps } from '../pageLookup'
import { migrationPaths } from '../paths'

/** The count of the running steps of one account. */
const stepCount = { type: 'integer', minimum: 0 } as const

/** The state of a page of the migration job, as one prop of the Providers tab. */
export const jobRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['settings', 'facts'],
  properties: {
    settings: {
      type: 'object',
      additionalProperties: false,
      required: ['pause', 'limit', 'savedPace', 'typedPace'],
      properties: {
        pause: { enum: jobSettingValues.pause },
        limit: { enum: jobSettingValues.limit },
        savedPace: { enum: jobSettingValues.savedPace },
        typedPace: { enum: jobSettingValues.typedPace },
      },
    },
    facts: {
      type: 'object',
      additionalProperties: false,
      required: ['at', 'wait', 'running'],
      properties: {
        at: { enum: jobFactValues.at },
        wait: { enum: jobFactValues.wait },
        running: {
          type: 'object',
          additionalProperties: false,
          required: ['boat', 'e2b'],
          properties: { boat: stepCount, e2b: stepCount },
        },
      },
    },
  },
} as const

/** The settings of a job that no control changed. */
const noChange: JobSettings = {
  pause: 'none',
  limit: 'none',
  savedPace: 'default',
  typedPace: 'none',
}

/** A page with these settings, at the time of these facts. */
function page(
  settings: Partial<JobSettings>,
  facts: JobFacts = pageFacts.later,
): JobRecord {
  return { settings: { ...noChange, ...settings }, facts }
}

const asked = { pause: 'asked' } as const

/** The path of a page of the migration job. */
type MigrationPath = (typeof migrationPaths)[keyof typeof migrationPaths]

const paths = migrationPaths

/**
 * Each page of the migration job, by its path, with its state. Each path
 * has one, so a new page needs its state here. The entries read their
 * props here, and each control of the job finds its page here.
 */
export const migrationPages: Readonly<Record<MigrationPath, JobRecord>> = {
  [paths.running]: page({}),
  [paths.counted]: page({}, pageFacts.counted),
  [paths.counting]: page({}, pageFacts.counting),
  [paths.countingLimit]: page({ limit: 'question' }, pageFacts.counting),
  [paths.countingLimited]: page({ limit: 'hexwave' }, pageFacts.counting),
  [paths.countingPaused]: page(asked, pageFacts.counting),
  [paths.pausing]: page(asked),
  [paths.pausingLimited]: page({ ...asked, limit: 'hexwave' }),
  [paths.pausingPace]: page({ ...asked, savedPace: 'faster' }),
  [paths.pausingRateLimit]: page(asked, pageFacts.rateLimit),
  [paths.pausingCapacity]: page(asked, pageFacts.capacity),
  [paths.paused]: page(asked, pageFacts.drained),
  [paths.pausedLimited]: page(
    { ...asked, limit: 'hexwave' },
    pageFacts.drained,
  ),
  [paths.pausedLimit]: page({ ...asked, limit: 'question' }, pageFacts.drained),
  [paths.pausedPace]: page(
    { ...asked, savedPace: 'faster' },
    pageFacts.drained,
  ),
  [paths.refused]: page({}, pageFacts.rateLimit),
  [paths.capacity]: page({}, pageFacts.capacity),
  [paths.limit]: page({ limit: 'question' }),
  [paths.limited]: page({ limit: 'hexwave' }),
  [paths.limitedDone]: page({ limit: 'hexwave' }, pageFacts.hexwaveDone),
  [paths.everyOrg]: page({}, pageFacts.hexwaveDone),
  [paths.pace]: page({ typedPace: 'faster' }),
  [paths.paceSaved]: page({ savedPace: 'faster' }),
  [paths.paceNotSaved]: page({ typedPace: 'save-failed' }),
  [paths.done]: page({}, pageFacts.done),
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
