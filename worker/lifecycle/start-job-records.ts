import type { QueueTurn } from '../chat/queue-turn'
import type { AppEnv } from '../env'
import { observeProviders } from '../sandbox/client'
import {
  LIFECYCLE_STATE_KEY,
  type DurableLifecycleState,
} from './durable-types'
import { currentWorkerVersion, type JobOutcome } from './job-steps'
import type { WorkspaceStorage } from './platform-storage'
import {
  addRun,
  closeOpenSteps,
  patchSteps,
  readStartRecordMeta,
  recordJobId,
  START_RECORD_META_KEY,
  type StartRecordJob,
  type StartRecordMeta,
  type StepPatch,
} from './start-record-buffer'
import {
  computerPatches,
  openStep,
  phasePatches,
  startStepPatches,
} from './start-record-patches'
import {
  recordSafely,
  sendRestStartRecords,
  sendStartRecords,
} from './start-record-send'
import { StartRunTimer, type ComputerMark } from './start-run-timer'
import { START_JOB_KEY } from './start-storage'
import type { WorkspaceStartJob } from './start-types'
import { timedDatabase } from './timed-d1'
import { timedProvider } from './timed-provider'

interface OpenRun {
  job: StartRecordJob
  phase: WorkspaceStartJob['phase']
  dueAt: number | null
  beganAt: number
  /** Only the machine phases of a running job record computer steps. */
  computer: boolean
}

export interface StartRun {
  end(): Promise<void>
}

/**
 * The job step records of the starts of one workspace object, as
 * `docs/protocol/step-timing.md` requires. Its env times the D1 and provider
 * calls of each start run. The rows wait in object storage, and go to D1 in
 * the batch of a shown-state write. A record never fails or holds back a
 * start: each failure here drops the record with a warning.
 */
export class StartJobRecords {
  readonly env: AppEnv
  /** Record statements come from the plain binding, so that any batch takes them. */
  private readonly db: D1Database
  private readonly storage: WorkspaceStorage
  private readonly now: () => number
  private readonly timer: StartRunTimer
  private running: StartRecordJob | undefined

  constructor(env: AppEnv, storage: WorkspaceStorage, now: () => number) {
    const timer = new StartRunTimer(now)
    this.timer = timer
    this.db = env.DB
    this.storage = storage
    this.now = now
    const db = timedDatabase(env.DB, timer)
    observeProviders(db, {
      plain: env.DB,
      observe: (provider) => timedProvider(provider, timer),
    })
    // A live view, so that the controller reads the same env values as the
    // rest of the object, also values that a test sets after the start. The
    // target is a fresh copy, so its keys stay free to give another value.
    this.env = new Proxy(
      { ...env, DB: db },
      { get: (_copy, key) => (key === 'DB' ? db : Reflect.get(env, key)) },
    )
  }

  queued<T>(
    operation: (turn: QueueTurn) => Promise<T>,
  ): (turn: QueueTurn) => Promise<T> {
    return this.timer.queued(operation)
  }

  outside<T>(turn: QueueTurn, call: () => Promise<T>): Promise<T> {
    return this.timer.outside(turn, call)
  }

  jobBegan(job: WorkspaceStartJob): Promise<void> {
    return recordSafely(undefined, async () => {
      const at = this.now()
      const meta: StartRecordMeta = { ...recordJob(job), beganAt: at, runs: 0 }
      await this.storage.transaction(async (transaction) => {
        const replaced = await readStartRecordMeta(transaction)
        if (replaced && replaced.jobId !== meta.jobId)
          await closeOpenSteps(transaction, replaced.jobId, at, 'failed')
        await transaction.put('startRecordMeta', START_RECORD_META_KEY, meta)
        await patchSteps(transaction, meta, [
          openStep(`phase:${job.phase}`, at),
        ])
      })
    })
  }

  /** Only a running job moves between phases. A failed job keeps its phase. */
  phaseChanged(
    before: WorkspaceStartJob,
    after: WorkspaceStartJob,
  ): Promise<void> {
    if (
      recordJobId(before) !== recordJobId(after) ||
      before.phase === after.phase ||
      [before, after].some((job) => job.cancelled || job.failure)
    )
      return Promise.resolve()
    return recordSafely(undefined, async () => {
      await this.saveMarks()
      await this.patch(
        recordJobId(after),
        phasePatches(before.phase, after.phase, this.now()),
      )
    })
  }

  /** The end of a job closes each step that is still open with its outcome. */
  jobEnded(job: WorkspaceStartJob, outcome: JobOutcome): Promise<void> {
    return recordSafely(undefined, async () => {
      await this.saveMarks()
      const at = this.now()
      const state = await this.storage.get('lifecycle', LIFECYCLE_STATE_KEY)
      await this.storage.transaction(async (transaction) => {
        const meta = await readStartRecordMeta(transaction)
        if (meta?.jobId !== recordJobId(job)) return
        const steps = startStepPatches(state?.start ?? null, meta)
        await patchSteps(transaction, meta, steps)
        await closeOpenSteps(transaction, meta.jobId, at, outcome)
      })
    })
  }

  /** A start run is a lifecycle run whose begin finds a start job that is not cancelled. */
  async begin(dueAt: number | null): Promise<StartRun> {
    const beganAt = this.now()
    const run = await recordSafely(undefined, async () => {
      const job = await this.storage.get('job', START_JOB_KEY)
      const meta = await readStartRecordMeta(this.storage)
      if (!job || job.cancelled || meta?.jobId !== recordJobId(job))
        return undefined
      const { jobId, jobKind, orgId, workspaceId } = meta
      const open: OpenRun = {
        job: { jobId, jobKind, orgId, workspaceId },
        phase: job.phase,
        dueAt,
        beganAt,
        computer:
          (job.phase === 'machine' || job.phase === 'ready') && !job.failure,
      }
      return open
    })
    this.running = run?.job
    if (run) this.timer.begin(run.computer)
    else this.timer.discard()
    return { end: () => this.end(run) }
  }

  /** Sends the buffered rows in the batch of a shown-state write. */
  async send(
    state: DurableLifecycleState,
    write: (records: readonly D1PreparedStatement[]) => Promise<void>,
  ): Promise<void> {
    await recordSafely(undefined, () => this.saveMarks())
    await sendStartRecords(this.storage, this.db, state, write)
  }

  private end(run: OpenRun | undefined): Promise<void> {
    const endedAt = this.now()
    const closed = this.timer.end()
    this.running = undefined
    return recordSafely(undefined, async () => {
      if (run && closed) {
        await this.saveMarks(run.job, closed.marks)
        await this.storage.transaction(async (transaction) => {
          const meta = await readStartRecordMeta(transaction)
          if (meta?.jobId !== run.job.jobId) return
          const runNumber = meta.runs + 1
          await transaction.put('startRecordMeta', START_RECORD_META_KEY, {
            ...meta,
            runs: runNumber,
          })
          await addRun(transaction, {
            ...run.job,
            runNumber,
            phase: run.phase,
            dueAt: run.dueAt,
            beganAt: run.beganAt,
            endedAt: Math.max(run.beganAt, endedAt),
            ...closed.totals,
            workerVersion: currentWorkerVersion(),
          })
        })
      }
      if (await this.storage.get('job', START_JOB_KEY)) return
      // A suspension deletes the job with no job end, so its steps close here.
      await this.storage.transaction(async (transaction) => {
        const meta = await readStartRecordMeta(transaction)
        if (meta)
          await closeOpenSteps(transaction, meta.jobId, endedAt, 'failed')
      })
      await sendRestStartRecords(this.storage, this.db)
      if (await readStartRecordMeta(this.storage))
        await this.storage.delete(START_RECORD_META_KEY)
    })
  }

  /** Marks of outside calls wait in memory, so that only the queue writes storage. */
  private async saveMarks(
    job = this.running,
    marks: readonly ComputerMark[] = this.timer.takeMarks(),
  ): Promise<void> {
    if (job && marks.length)
      await this.patch(job.jobId, marks.flatMap(computerPatches))
  }

  private patch(jobId: string, patches: readonly StepPatch[]): Promise<void> {
    return this.storage.transaction(async (transaction) => {
      const meta = await readStartRecordMeta(transaction)
      if (meta?.jobId === jobId) await patchSteps(transaction, meta, patches)
    })
  }
}

function recordJob(job: WorkspaceStartJob): StartRecordJob {
  return {
    jobId: recordJobId(job),
    jobKind: job.kind,
    orgId: job.orgId,
    workspaceId: job.workspaceId,
  }
}
