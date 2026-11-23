import type {
  AccountStage,
  FailedStep,
  JobRow,
  JobState,
  SkipReason,
} from './migrationModel'

/**
 * The words of the migration job on the Providers tab of the operator
 * (own computer decision 7 D): its box, the pace of each account, the
 * failures and the skips, and the limit to one org. Operator screens name
 * each provider account by its ID. A login goes in without `@`, and a time
 * as the page writes it. This module imports no fixture, so the app can
 * use it too.
 */
export const jobWords = {
  title: 'Migration job',
  line: 'Installs the host program on each machine that runs or that a workspace keeps, and refreshes each org image once. Its restart of a running machine ends each turn that runs there.',
  counting:
    'The job counts the machines of each account before its first start.',
  started: 'Started',
  orgs: 'Orgs',
  everyOrg: 'Every org',
  paused: 'Paused',
  done: 'Done',
  accountsLabel: 'The job on each account',
  pause: 'Pause job',
  continue: 'Continue job',
  limit: 'Limit to one org',
  removeLimit: 'Remove limit',
  notLoaded: "The migration job didn't load",
} as const

/** The word of each state of the whole job. */
export const jobStateLabels: Readonly<Record<JobState, string>> = {
  counting: 'Counting',
  running: 'Running',
  waiting: 'Waiting',
  paused: 'Paused',
  done: 'Done',
}

/** The state and the kind of work of each row of an account. */
export const jobRowLabels: Readonly<
  Record<JobRow, { state: string; kind: string }>
> = {
  running: { state: 'Running', kind: 'restart' },
  stopped: { state: 'Stopped', kind: 'brief start' },
  error: { state: 'Error', kind: 'brief start' },
  archived: { state: 'Archived', kind: 'brief start' },
  images: { state: 'Org images', kind: 'refresh' },
}

/** A whole number as the page writes it, such as 1,604. */
function count(value: number): string {
  return value.toLocaleString('en')
}

/** The progress of one row, such as "562 of 1,604". */
export function rowProgress(handled: number, total: number): string {
  return `${count(handled)} of ${count(total)}`
}

/**
 * The time that a number of starts takes at the pace of an account, from
 * its starts in each hour: "less than an hour", "about 20 hours", or
 * "about 3 days".
 */
function timeAtPace(starts: number, perHour: number): string {
  const hours = starts / perHour
  if (hours < 1) return 'less than an hour'
  if (hours < 24) return `about ${Math.round(hours)} hours`
  const days = Math.round(hours / 24)
  return days === 1 ? 'about 1 day' : `about ${days} days`
}

/**
 * The line of an account before its first start: the expected starts and
 * the expected time. They follow the restarts of its running machines.
 */
export function expectedLine(
  starts: number,
  perHour: number,
  restarts: boolean,
): string {
  const after = restarts ? ' after the restarts' : ''
  const noun = starts === 1 ? 'start' : 'starts'
  return `${count(starts)} expected ${noun}${after}: ${timeAtPace(starts, perHour)} at this pace.`
}

/** The line of an account while the job runs: the starts that are left. */
export function leftLine(left: number, perHour: number): string {
  const noun = left === 1 ? 'start' : 'starts'
  return `${count(left)} ${noun} left: ${timeAtPace(left, perHour)} at this pace.`
}

/** The state of the job on one account, as its label says it. */
export function accountStageLabel(stage: AccountStage): string {
  switch (stage.kind) {
    case 'running':
      return 'Running'
    case 'refused':
      return `Waiting until ${stage.until}`
    case 'paused':
      return 'Paused'
    case 'limited':
      return 'Waiting for the limit'
    case 'done':
      return 'Done'
  }
}

/**
 * The line of an account that waits after a refusal of its provider: why,
 * and that each refusal makes the next wait longer. The ID goes in
 * backticks, so the line shows it as code.
 */
export function refusalLine(
  account: string,
  reason: 'rate-limit' | 'capacity',
): string {
  const limit = reason === 'rate-limit' ? 'its rate limit' : 'its capacity'
  return `\`${account}\` refused a start for ${limit}. The job waits longer after each refusal.`
}

/** When, and by which operator, the job was paused. */
export function pausedValue(at: string, operator: string): string {
  return `${at} by @${operator}`
}

/** The value of Orgs while the job is limited to one org. */
export function onlyOrg(org: string): string {
  return `${org} only`
}

/**
 * The line of the job while it is limited to one org: its progress there,
 * or that it is done there, and what the other orgs do.
 */
export function limitLine(
  org: string,
  handled: number,
  starts: number,
): string {
  if (handled === starts) {
    return `${org} is done. Remove the limit to go on with every org.`
  }
  return `The job works only on ${org}: ${count(handled)} of its ${count(starts)} starts are done. The other orgs wait until you remove the limit.`
}

/** The words of the Pace box: the starts in each hour and the machines at once. */
export const paceWords = {
  title: 'Pace of the job',
  line: (perHour: number, atOnce: number) =>
    `On each account, the job starts at most this many machines in each hour, with at most this many at once. The default is ${perHour} in each hour and ${atOnce} at once.`,
  label: 'Pace of the migration job on each account',
  perHour: 'in each hour',
  atOnce: 'at once',
  save: 'Save pace',
  notSaved: "The pace wasn't saved. Try again.",
} as const

/** The spoken name of one field of the pace of an account. */
export function paceFieldLabel(account: string, field: 'perHour' | 'atOnce') {
  const name = field === 'perHour' ? 'Starts in each hour' : 'Machines at once'
  return `${name} on ${account}`
}

/** The line under the pace: when, and by which operator, it last changed. */
export function paceChangedLine(when: string, operator: string): string {
  return `Changed on ${when} by @${operator}`
}

/** The words of the box of the failures and the skips. */
export const problemWords = {
  title: 'Failures and skips',
  line: 'A machine that the job skipped, or whose step failed, gets the host program at its next start.',
  failed: 'Failed',
  skipped: 'Skipped',
  none: 'No failure and no skip yet.',
  orgImage: 'Org image',
} as const

/** What failed in each step. */
export const failedStepLabels: Readonly<Record<FailedStep, string>> = {
  restart: 'Restart: no host connection after the restart',
  'brief-start': 'Brief start: no host connection within 30 minutes',
  refresh: 'Refresh: the refresh failed',
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

/** The words of the question before the limit to one org. */
export const limitWords = {
  title: 'Limit the job to one org',
  text: 'The job then works only on the machines and the org image of this org. The other orgs wait until you remove the limit.',
  field: 'Org ID',
  found: (org: string, workspaces: number, account: string) =>
    `${org}: ${count(workspaces)} workspaces on ${account}`,
  confirm: 'Limit job',
  cancel: 'Cancel',
} as const
