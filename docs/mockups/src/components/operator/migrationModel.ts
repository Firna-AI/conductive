/**
 * The data of the migration job on the Providers tab of the operator: the
 * job that installs the host program on each machine when the host
 * connection deploys (own computer decision 7 D). The shapes follow what
 * the operator route of the job gives: the counts of each provider account
 * by state and kind, the running steps, the waits, the progress, and the
 * pace, with the rules of what the job and each account show.
 * `jobProblemsModel.ts` holds the failures and the skips. This module
 * imports no fixture, so the app can use it too.
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

/** The rows of the job on one account or on one org, by state and kind. */
export type JobRows = Readonly<Record<JobRow, RowProgress>>

/** The wait of an account after a refusal of its provider. */
type AccountWait = { until: string; reason: 'rate-limit' | 'capacity' }

/**
 * The job on one provider account, which the settings of the Worker name:
 * its rows, the steps that run there now, its wait after a refusal of its
 * provider while it holds, and its saved pace. A running step is a
 * restart, a brief start, or a refresh.
 */
export type JobAccount = {
  id: string
  rows: JobRows
  running: number
  wait?: AccountWait
  pace: Pace
}

/**
 * What one account shows: it runs, it waits after a refusal of its
 * provider, it pauses while steps still run, it is paused, it waits while
 * a limit to one org holds its work, or it is done.
 */
export type AccountStage =
  | { kind: 'running' }
  | ({ kind: 'refused' } & AccountWait)
  | { kind: 'pausing'; steps: number }
  | { kind: 'paused' }
  | { kind: 'limited' }
  | { kind: 'done' }

/**
 * The one org that the job is limited to, its account, and its machines
 * and its org image by state and kind, in the rows of an account,
 * restarts included. While the job counts, the org has no rows yet.
 */
type JobLimit = { org: string; account: string; rows?: JobRows }

/**
 * The job: when it started, whether its count goes on, the pause that an
 * operator asked for, with its time and its operator, when it finished,
 * its limit to one org, and its accounts. While the job counts, it has no
 * account yet.
 */
export type MigrationJob = {
  started: string
  counting: boolean
  pause?: { at: string; by: string }
  done?: string
  limit?: JobLimit
  accounts: readonly JobAccount[]
}

/** What the whole job shows, as the rule of `jobState` derives it. */
export type JobState =
  | { kind: 'counting' }
  | { kind: 'running' }
  | { kind: 'waiting' }
  | { kind: 'pausing'; steps: number }
  | { kind: 'paused' }
  | { kind: 'done' }

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

/**
 * Whether the limit to one org holds the work of an account: the work of
 * that org on the account ended, or the org has no work there. Until the
 * count ends, the limit has no rows and holds nothing yet.
 */
function heldByLimit(account: JobAccount, limit: JobLimit | undefined) {
  if (limit?.rows === undefined) return false
  return account.id !== limit.account || workLeft(limit.rows) === 0
}

/**
 * The one rule of what an account shows. Its work ended: Done. After Pause
 * job, the job starts no new step there, and each running step goes on to
 * its end: Pausing with the count of those steps, then Paused when none
 * runs. Else a wait after a refusal of its provider, then a limit that
 * holds its work, and else Running. A pause keeps the wait and the limit.
 */
export function accountStage(
  account: JobAccount,
  job: Pick<MigrationJob, 'pause' | 'limit'>,
): AccountStage {
  if (workLeft(account.rows) === 0) return { kind: 'done' }
  if (job.pause !== undefined) {
    const steps = account.running
    return steps > 0 ? { kind: 'pausing', steps } : { kind: 'paused' }
  }
  if (account.wait !== undefined) return { kind: 'refused', ...account.wait }
  if (heldByLimit(account, job.limit)) return { kind: 'limited' }
  return { kind: 'running' }
}

/**
 * The one rule of what the whole job shows. After Pause job, it shows
 * Pausing with the sum of the running steps of every account, then Paused
 * when none runs, also while the count goes on. Else Counting while the
 * count goes on, Running while an account runs, and else Waiting.
 */
export function jobState(job: MigrationJob): JobState {
  if (job.done !== undefined) return { kind: 'done' }
  if (job.pause !== undefined) {
    const steps = job.accounts.reduce((sum, item) => sum + item.running, 0)
    return steps > 0 ? { kind: 'pausing', steps } : { kind: 'paused' }
  }
  if (job.counting) return { kind: 'counting' }
  const runs = job.accounts.some(
    (item) => accountStage(item, job).kind === 'running',
  )
  return runs ? { kind: 'running' } : { kind: 'waiting' }
}
