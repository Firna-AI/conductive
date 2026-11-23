/**
 * The pages of the migration job of the host connection on the Providers
 * tab of the operator (own computer decision 7 D): the job before its first
 * start, with a limit or a pause during its count, while it runs, pausing,
 * paused, waiting after a refusal of a provider, limited to one org, with
 * its pace, and done. A pause keeps the wait, the limit, and the saved pace
 * of the job.
 */
export const migrationPaths = {
  running: 'app/operator/providers/migration',
  counted: 'app/operator/providers/migration/counted',
  counting: 'app/operator/providers/migration/counted/counting',
  countingLimit: 'app/operator/providers/migration/counted/counting-limit',
  countingLimited: 'app/operator/providers/migration/counted/counting-limited',
  countingPaused: 'app/operator/providers/migration/counted/counting-paused',
  pausing: 'app/operator/providers/migration/pausing',
  pausingLimited: 'app/operator/providers/migration/pausing/limited',
  pausingPace: 'app/operator/providers/migration/pausing/saved-pace',
  pausingRateLimit: 'app/operator/providers/migration/pausing/rate-limit',
  pausingCapacity: 'app/operator/providers/migration/pausing/capacity',
  paused: 'app/operator/providers/migration/paused',
  pausedLimited: 'app/operator/providers/migration/paused/limited',
  pausedLimit: 'app/operator/providers/migration/paused/limit-question',
  pausedPace: 'app/operator/providers/migration/paused/saved-pace',
  refused: 'app/operator/providers/migration/refused',
  capacity: 'app/operator/providers/migration/refused/capacity',
  limit: 'app/operator/providers/migration/one-org',
  limited: 'app/operator/providers/migration/one-org/limited',
  limitedDone: 'app/operator/providers/migration/one-org/limited-done',
  everyOrg: 'app/operator/providers/migration/one-org/every-org',
  pace: 'app/operator/providers/migration/pace',
  paceSaved: 'app/operator/providers/migration/pace/saved',
  paceNotSaved: 'app/operator/providers/migration/pace/not-saved',
  done: 'app/operator/providers/migration/done',
} as const
