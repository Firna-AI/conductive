import {
  currentWorkerVersion,
  type JobOutcome,
  type JobRunRecord,
  type StartStepRecord,
} from './job-steps'
import type { WorkspaceStorage, WorkspaceTransaction } from './platform-storage'

/**
 * The buffer of the job step records of starts in the storage of a
 * workspace object. Each row has its own key, so a concurrent add is never
 * lost. A step row of the running job stays after its send, so that later
 * changes merge into it. Other rows go after their send.
 */
const PREFIX = 'lifecycle:job-record:'
export const START_RECORD_META_KEY = 'lifecycle:job-record-meta'

export type StartRecordEntry =
  | { kind: 'step'; sent: boolean; record: StartStepRecord }
  | { kind: 'run'; record: JobRunRecord }

/** The job that the buffer records. Only a job with this meta gets records. */
export interface StartRecordMeta {
  jobId: string
  jobKind: StartStepRecord['jobKind']
  orgId: string
  workspaceId: string
  beganAt: number
  runs: number
}

export type StartRecordJob = Pick<
  StartRecordMeta,
  'jobId' | 'jobKind' | 'orgId' | 'workspaceId'
>

/** A change of one step. `ifOpen` changes only a step that has not ended. */
export interface StepPatch {
  step: string
  startedAt: number
  endedAt: number | null
  outcome: JobOutcome | null
  ifOpen?: boolean
}

type BufferedEntry = readonly [key: string, entry: StartRecordEntry]

export function readStartRecordMeta(
  storage: Pick<WorkspaceTransaction, 'get'>,
): Promise<StartRecordMeta | undefined> {
  return storage.get('startRecordMeta', START_RECORD_META_KEY)
}

function stepKey(jobId: string, step: string): string {
  return `${PREFIX}${jobId}:${step}`
}

function runKey(jobId: string, runNumber: number): string {
  return `${PREFIX}${jobId}:run:${String(runNumber).padStart(6, '0')}`
}

function ordered(startedAt: number, endedAt: number | null): number | null {
  return endedAt === null ? null : Math.max(startedAt, endedAt)
}

/** The same rule as the upsert in D1: the first begin and the latest end. */
function mergeStep(
  old: StartStepRecord | undefined,
  next: StartStepRecord,
): StartStepRecord {
  const startedAt = Math.min(old?.startedAt ?? next.startedAt, next.startedAt)
  return {
    ...next,
    startedAt,
    endedAt: ordered(startedAt, next.endedAt ?? old?.endedAt ?? null),
    outcome: next.outcome ?? old?.outcome ?? null,
    workerVersion: old?.workerVersion ?? next.workerVersion,
  }
}

/** Rows keep a fixed field order, so equal rows give equal JSON. */
function same<T>(left: T | undefined, right: T): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export async function patchSteps(
  transaction: WorkspaceTransaction,
  job: StartRecordJob,
  patches: readonly StepPatch[],
): Promise<void> {
  for (const patch of patches) {
    const key = stepKey(job.jobId, patch.step)
    const current = await transaction.get('startRecord', key)
    const old = current?.kind === 'step' ? current.record : undefined
    if (patch.ifOpen && (!old || old.endedAt !== null)) continue
    const record = mergeStep(old, {
      jobId: job.jobId,
      jobKind: job.jobKind,
      orgId: job.orgId,
      workspaceId: job.workspaceId,
      step: patch.step,
      startedAt: patch.startedAt,
      endedAt: patch.endedAt,
      outcome: patch.outcome,
      workerVersion: currentWorkerVersion(),
    })
    if (!same(old, record))
      await transaction.put('startRecord', key, {
        kind: 'step',
        sent: false,
        record,
      })
  }
}

/** The end of a job closes each of its steps that is still open. */
export async function closeOpenSteps(
  transaction: WorkspaceTransaction,
  jobId: string,
  endedAt: number,
  outcome: JobOutcome,
): Promise<void> {
  const entries = await transaction.list('startRecord', {
    prefix: `${PREFIX}${jobId}:`,
  })
  for (const [key, entry] of entries) {
    if (entry.kind !== 'step' || entry.record.jobId !== jobId) continue
    if (entry.record.endedAt !== null) continue
    await transaction.put('startRecord', key, {
      kind: 'step',
      sent: false,
      record: {
        ...entry.record,
        endedAt: Math.max(entry.record.startedAt, endedAt),
        outcome,
      },
    })
  }
}

export async function addRun(
  transaction: WorkspaceTransaction,
  record: JobRunRecord,
): Promise<void> {
  await transaction.put('startRecord', runKey(record.jobId, record.runNumber), {
    kind: 'run',
    record,
  })
}

/**
 * Rows to send: up to `limit` rows that D1 does not hold yet. Stale rows are
 * sent step rows of a job that is not running anymore.
 */
export async function bufferedRows(
  storage: WorkspaceStorage,
  runningJobId: string | null,
  limit: number,
): Promise<{ unsent: BufferedEntry[]; stale: BufferedEntry[] }> {
  const unsent: BufferedEntry[] = []
  const stale: BufferedEntry[] = []
  const entries = await storage.list('startRecord', {
    prefix: PREFIX,
    limit: 2_000,
  })
  for (const [key, entry] of entries) {
    if (entry.kind === 'run' || !entry.sent) {
      if (unsent.length < limit) unsent.push([key, entry])
    } else if (entry.record.jobId !== runningJobId) stale.push([key, entry])
  }
  return { unsent, stale }
}

/**
 * After a send, each unchanged row is marked sent, or deleted when it is a
 * run row, a dropped row, or a row of a job that is not running. A row that
 * changed during the send stays unsent for the next send.
 */
export async function settleRows(
  transaction: WorkspaceTransaction,
  rows: { unsent: readonly BufferedEntry[]; stale: readonly BufferedEntry[] },
  runningJobId: string | null,
  dropped: boolean,
): Promise<void> {
  for (const [key, entry] of rows.unsent) {
    if (!same(await transaction.get('startRecord', key), entry)) continue
    if (dropped || entry.kind === 'run' || entry.record.jobId !== runningJobId)
      await transaction.delete(key)
    else await transaction.put('startRecord', key, { ...entry, sent: true })
  }
  for (const [key, entry] of rows.stale)
    if (same(await transaction.get('startRecord', key), entry))
      await transaction.delete(key)
}

/**
 * Each try of a start gets its own records. A continued create keeps its
 * attempt and gets a new command attempt, as its command journal does.
 */
export function recordJobId(job: {
  attempt: string
  commandAttempt?: string
}): string {
  return job.commandAttempt ?? job.attempt
}
