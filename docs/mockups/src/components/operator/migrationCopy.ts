import { counted } from '../common/counted'
import type { AccountStage, JobRow, JobState, Pace } from './migrationModel'

/**
 * The words of the migration job on the Providers tab of the operator
 * (own computer decision 7 D): its box, the pace of each account, and the
 * limit to one org. `jobProblemsCopy.ts` holds the words of the failures
 * and the skips. Operator screens name
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
 * its starts in each hour: "less than an hour", "about 1 hour", "about 20
 * hours", "about 1 day", or "about 3 days".
 */
function timeAtPace(starts: number, perHour: number): string {
  const hours = starts / perHour
  if (hours < 1) return 'less than an hour'
  if (hours < 24) return `about ${counted(Math.round(hours), 'hour')}`
  return `about ${counted(Math.round(hours / 24), 'day')}`
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
  return `${counted(starts, 'expected start')}${after}: ${timeAtPace(starts, perHour)} at this pace.`
}

/** The line of an account while the job runs: the starts that are left. */
export function leftLine(left: number, perHour: number): string {
  return `${counted(left, 'start')} left: ${timeAtPace(left, perHour)} at this pace.`
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
 * The line of the job while it is limited to one org. `left` is the work
 * of that org that the job has not handled yet, over every row, restarts
 * included, or null while the job counts. The line says what the job does
 * for that org, or that the work there ended, and what the other orgs do.
 */
export function limitLine(org: string, left: number | null): string {
  if (left === null) {
    return `After the count, the job works only on ${org}. The other orgs wait until you remove the limit.`
  }
  if (left === 0) {
    return `${org} is done. Remove the limit to go on with every org.`
  }
  return `The job works only on ${org}, which has ${counted(left, 'step')} left. The other orgs wait until you remove the limit.`
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
  record: 'The saved pace of each account when the job ended.',
} as const

/**
 * The pace of one account as text, such as "30 starts in each hour and 3
 * machines at once".
 */
export function paceText(pace: Pace): string {
  return `${counted(pace.perHour, 'start')} in each hour and ${counted(pace.atOnce, 'machine')} at once`
}

/** The spoken name of one field of the pace of an account. */
export function paceFieldLabel(account: string, field: 'perHour' | 'atOnce') {
  const name = field === 'perHour' ? 'Starts in each hour' : 'Machines at once'
  return `${name} on ${account}`
}

/** The line under the pace: when, and by which operator, it last changed. */
export function paceChangedLine(when: string, operator: string): string {
  return `Changed on ${when} by @${operator}`
}

/** The words of the question before the limit to one org. */
export const limitWords = {
  title: 'Limit the job to one org',
  text: 'The job then works only on the machines and the org image of this org. The other orgs wait until you remove the limit.',
  field: 'Org ID',
  found: (org: string, workspaces: number, account: string) =>
    `${org}: ${counted(workspaces, 'workspace')} on ${account}`,
  confirm: 'Limit job',
  cancel: 'Cancel',
} as const
