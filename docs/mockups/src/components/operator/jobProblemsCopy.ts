import type { SkipReason, StepFailure } from './jobProblemsModel'

/**
 * The words of the box of the failures and the skips of the migration job
 * on the Providers tab of the operator (own computer decision 7 D). The
 * operator section shows counts, names, IDs, dates, and codes, so a failed
 * step shows fixed words for its cause, never the text of an error. This
 * module imports no fixture, so the app can use it too.
 */
export const problemWords = {
  title: 'Failures and skips',
  line: 'A machine that the job skipped, or whose step failed, gets the host program at its next start.',
  failed: 'Failed',
  skipped: 'Skipped',
  none: 'No failure and no skip yet.',
  orgImage: 'Org image',
} as const

/** The words of each cause of a failed restart. */
const restartCauses = {
  download: "Restart: the release didn't download",
  restart: "Restart: the runner didn't restart",
  'not-ready': "Restart: the runner wasn't ready within 3 minutes",
  unknown: 'Restart failed, with no known cause',
} as const

/** The words of each cause of a failed brief start. */
const briefStartCauses = {
  download: "Brief start: the release didn't download",
  'no-connection': 'Brief start: no host connection within 30 minutes',
  unknown: 'Brief start failed, with no known cause',
} as const

/** The words of each cause of a failed refresh of an org image. */
const refreshCauses = {
  'time-limit': 'Refresh: passed its 60-minute limit',
  unknown: 'Refresh failed, with no known cause',
} as const

/**
 * What failed, and why: the step with its cause. A cause that the job does
 * not know gets neutral words, which name only the step that failed.
 */
export function failureText(failure: StepFailure): string {
  switch (failure.step) {
    case 'restart':
      return restartCauses[failure.cause]
    case 'brief-start':
      return briefStartCauses[failure.cause]
    case 'refresh':
      return refreshCauses[failure.cause]
  }
}

/** Each reason of a skip, in the order of the list. */
export const skipLabels: Readonly<Record<SkipReason, string>> = {
  suspended: 'Owner or org suspended',
  'deleted-org': 'Org deleted',
  'restore-ends': 'Restore ends within a day',
  'no-sandbox': 'No sandbox, or its delete runs',
  'provider-error': 'Provider error or missing disk',
  creating: 'Creating or starting',
  'not-configured': 'Account not configured',
}

/** The line that names the orgs with no active admin, which get no refresh. */
export function noAdminLine(orgs: readonly string[]): string {
  const names = orgs.join(', ')
  return orgs.length === 1
    ? `${names} has no active admin, so its org image gets no refresh.`
    : `${names} have no active admin, so their org images get no refresh.`
}
