/**
 * The data of the migration job on the Providers tab of the operator: the
 * job that installs the host program on each machine when the host
 * connection deploys (own computer decision 7 D). The shapes follow what
 * the operator route of the job gives: the counts of each provider account
 * by state and kind, the progress, the pace, and the failures and skips.
 * This module imports no fixture, so the app can use it too.
 */

/**
 * The rows of one account, in the order of the job: the running machines,
 * which get a restart first, then the machines that a workspace keeps,
 * which get a brief start, then the org images, which get one refresh.
 */
export const jobRows = [
  'running',
  'stopped',
  'error',
  'archived',
  'images',
] as const

export type JobRow = (typeof jobRows)[number]

/**
 * One row: what the job counted before its first start, and how many of
 * them it handled. A handled machine is done, failed, or skipped.
 */
export type RowProgress = { count: number; handled: number }

/** The pace of one account: the starts in each hour, and the machines at once. */
export type Pace = { perHour: number; atOnce: number }

/**
 * Where the job stands on one account: it runs, it waits after a refusal
 * of the provider for its rate limit or its capacity, it is paused, it
 * waits while a limit to one org holds its other orgs, or it is done.
 */
export type AccountStage =
  | { kind: 'running' }
  | { kind: 'refused'; until: string; reason: 'rate-limit' | 'capacity' }
  | { kind: 'paused' }
  | { kind: 'limited' }
  | { kind: 'done' }

/** The job on one provider account, which the settings of the Worker name. */
export type JobAccount = {
  id: string
  stage: AccountStage
  rows: Readonly<Record<JobRow, RowProgress>>
  /** The saved pace of the account. */
  pace: Pace
}

/** The state of the whole job. */
export type JobState = 'counting' | 'running' | 'waiting' | 'paused' | 'done'

/** The one org that the job is limited to, and its starts. */
type JobLimit = { org: string; starts: number; handled: number }

/**
 * The job: its state, when it started, when and by whom it was paused, when
 * it finished, its limit to one org, and its accounts. While the job counts,
 * it has no account yet.
 */
export type MigrationJob = {
  state: JobState
  started: string
  paused?: { at: string; by: string }
  done?: string
  limit?: JobLimit
  accounts: readonly JobAccount[]
}

/** The rows that start a machine: the brief starts and the refreshes. */
const startRows: readonly JobRow[] = ['stopped', 'error', 'archived', 'images']

/** The starts that the job expects on an account, as it counted them. */
export function expectedStarts(account: JobAccount): number {
  return startRows.reduce((sum, row) => sum + account.rows[row].count, 0)
}

/** The starts that the job has not handled yet on an account. */
export function startsLeft(account: JobAccount): number {
  return startRows.reduce((sum, row) => {
    const { count, handled } = account.rows[row]
    return sum + count - handled
  }, 0)
}

/** Whether the job has not started a machine on the account yet. */
export function beforeFirstStart(account: JobAccount): boolean {
  return startsLeft(account) === expectedStarts(account)
}

/** The step of the job that failed on a machine. */
export type FailedStep = 'restart' | 'brief-start' | 'refresh'

/**
 * A step that failed: its org, the workspace number and the cloud computer
 * ID of its machine, which an org image has none of, its step, and when.
 */
export type JobFailure = {
  org: string
  number?: number
  computer?: string
  step: FailedStep
  at: string
}

/** Why the job skipped a machine, as the job reports it. */
export type SkipReason =
  | 'suspended'
  | 'deleted-org'
  | 'restore-ends'
  | 'no-sandbox'
  | 'provider-error'
  | 'creating'
  | 'not-configured'

/**
 * What went wrong so far: each failed step, the skips of each reason, and
 * the orgs with no active admin, whose org images get no refresh.
 */
export type JobProblems = {
  failures: readonly JobFailure[]
  skips: Readonly<Record<SkipReason, number>>
  noAdmin: readonly string[]
}
