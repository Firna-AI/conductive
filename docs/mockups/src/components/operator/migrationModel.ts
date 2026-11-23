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
type RowProgress = { count: number; handled: number }

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

/** The rows of the job on one account or on one org, by state and kind. */
export type JobRows = Readonly<Record<JobRow, RowProgress>>

/** The job on one provider account, which the settings of the Worker name. */
export type JobAccount = {
  id: string
  stage: AccountStage
  rows: JobRows
  /** The saved pace of the account. */
  pace: Pace
}

/** The state of the whole job. */
export type JobState = 'counting' | 'running' | 'waiting' | 'paused' | 'done'

/**
 * The one org that the job is limited to, with its machines and its org
 * image by state and kind, in the rows of an account, restarts included.
 * While the job counts, the org has no rows yet.
 */
type JobLimit = { org: string; rows?: JobRows }

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

/**
 * The work that the job has not handled yet in some rows: each restart,
 * brief start, and refresh, over every row. The work of the rows ended
 * when it is 0.
 */
export function workLeft(rows: JobRows): number {
  return jobRows.reduce((sum, row) => {
    const { count, handled } = rows[row]
    return sum + count - handled
  }, 0)
}

/** The step of the job that failed on a machine. */
type FailedStep = 'restart' | 'brief-start' | 'refresh'

/**
 * The causes that the job tells apart for each step, from the rules of
 * that step, and `unknown` when the job has no cause:
 * - A restart downloads the release of the Worker, then restarts the
 *   runner, which must be ready within 3 minutes, as Restart does.
 * - A brief start installs the release, as the bootstrap does, and ends
 *   when the host program connects within its 30 minutes.
 * - A refresh has the 60-minute limit of each refresh of an org image.
 */
type StepCauses = {
  restart: 'download' | 'restart' | 'not-ready' | 'unknown'
  'brief-start': 'download' | 'no-connection' | 'unknown'
  refresh: 'time-limit' | 'unknown'
}

/** A failed step with one cause of that step. */
export type StepFailure = {
  [Step in FailedStep]: { step: Step; cause: StepCauses[Step] }
}[FailedStep]

/**
 * A step that failed: its org, the workspace number and the cloud computer
 * ID of its machine, which an org image has none of, its step with its
 * cause, and when.
 */
export type JobFailure = StepFailure & {
  org: string
  number?: number
  computer?: string
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
