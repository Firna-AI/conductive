/**
 * The pages of the migration job of the host connection on the Providers
 * tab of the operator (own computer decision 7 D): the job before its first
 * start, while it runs, paused, waiting after a refusal of a provider,
 * limited to one org, with its pace, and done. A pause keeps the limit and
 * the saved pace of the job.
 */
export const migrationPaths = {
  running: 'app/operator/providers/migration',
  counted: 'app/operator/providers/migration/counted',
  counting: 'app/operator/providers/migration/counted/counting',
  paused: 'app/operator/providers/migration/paused',
  pausedLimited: 'app/operator/providers/migration/paused/limited',
  pausedLimit: 'app/operator/providers/migration/paused/limit-question',
  pausedPace: 'app/operator/providers/migration/paused/saved-pace',
  refused: 'app/operator/providers/migration/refused',
  capacity: 'app/operator/providers/migration/refused/capacity',
  limit: 'app/operator/providers/migration/one-org',
  limited: 'app/operator/providers/migration/one-org/limited',
  limitedDone: 'app/operator/providers/migration/one-org/limited-done',
  pace: 'app/operator/providers/migration/pace',
  paceSaved: 'app/operator/providers/migration/pace/saved',
  paceNotSaved: 'app/operator/providers/migration/pace/not-saved',
  done: 'app/operator/providers/migration/done',
} as const
