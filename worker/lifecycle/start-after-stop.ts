import type { WorkspaceStorage } from './platform-storage'
import {
  readStartJob,
  serializeStartJob,
  type StoredWorkspaceStartJob,
} from './start-job-codec'
import type {
  StartJobStorage,
  WorkspaceStartIntent,
  WorkspaceStartJob,
} from './start-types'
import type { DurableLifecycleState } from './durable-types'
import { HttpError } from '../http'
import { requireOrgMember } from './access'
import { WORKSPACE_START_TIME_LIMIT_MS } from './job-time-limit'
import { readWorkspace } from './workspace-data'
import { taskWorkspaceTransaction } from './workspace-task-alarms'

export const START_AFTER_STOP_KEY = 'lifecycle:start-after-stop'
const STOP_EPOCH_KEY = 'lifecycle:stop-epoch'

/**
 * A resume or a Try again that came while the stop of the computer still
 * ran. The newest request replaces an older one. The stop epoch at the
 * request lets a later Archive drop it.
 */
export interface StoredStartAfterStop {
  job: StoredWorkspaceStartJob
  intent: WorkspaceStartIntent
  epoch: number
  requestedAt: number
}

export interface StartAfterStop {
  job: WorkspaceStartJob
  intent: WorkspaceStartIntent
  epoch: number
  requestedAt: number
}

export function startAfterStopStorage(
  storage: WorkspaceStorage,
  now: () => number,
) {
  return {
    /** Keeps the start, and makes the lifecycle check the stop at once. */
    holdAfterStop: (
      job: WorkspaceStartJob,
      intent: WorkspaceStartIntent,
      epoch: number,
    ): Promise<void> =>
      storage.transaction(async (transaction) => {
        await transaction.put('startAfterStop', START_AFTER_STOP_KEY, {
          job: serializeStartJob(job),
          intent,
          epoch,
          requestedAt: now(),
        })
        await taskWorkspaceTransaction(transaction, 'lifecycle').setAlarm(now())
      }),
    heldAfterStop: async (): Promise<StartAfterStop | undefined> => {
      const held = await storage.get('startAfterStop', START_AFTER_STOP_KEY)
      return held && { ...held, job: readStartJob(held.job) }
    },
    clearAfterStop: async (): Promise<void> => {
      await storage.delete(START_AFTER_STOP_KEY)
    },
  }
}

function expired(
  held: Pick<StoredStartAfterStop, 'epoch' | 'requestedAt'>,
  epoch: number,
  now: number,
): boolean {
  return (
    held.epoch !== epoch ||
    now >= held.requestedAt + WORKSPACE_START_TIME_LIMIT_MS
  )
}

/** Whether a held start can still run, so that the stop check comes sooner. */
export async function startHeldAfterStop(
  storage: WorkspaceStorage,
  now: number,
): Promise<boolean> {
  const held = await storage.get('startAfterStop', START_AFTER_STOP_KEY)
  if (!held) return false
  const epoch = (await storage.get('number', STOP_EPOCH_KEY)) ?? 0
  return !expired(held, epoch, now)
}

/** The checks of the resume request that admission does not repeat. */
async function stillAllowed(db: D1Database, job: WorkspaceStartJob) {
  const row = await readWorkspace(db, job.orgId, job.workspaceId)
  if (row.archivedAt !== null) return false
  if (job.requestedByUserId)
    await requireOrgMember(db, job.orgId, job.requestedByUserId)
  return true
}

/**
 * Queues the held start once the stop ends. An Archive after the request,
 * a later start, or a wait past the start time limit drops it. The queue
 * repeats the admission checks, and the checks of the request run again.
 * So a start that is no longer allowed starts nothing. A short failure
 * keeps the held start for the next lifecycle run.
 */
export async function queueStartAfterStop(
  input: {
    db: D1Database
    storage: Pick<StartJobStorage, 'heldAfterStop' | 'clearAfterStop' | 'epoch'>
    state: DurableLifecycleState | undefined
    now: number
  },
  enqueue: (
    job: WorkspaceStartJob,
    intent: WorkspaceStartIntent,
  ) => Promise<boolean>,
): Promise<void> {
  const { db, storage, state, now } = input
  const held = await storage.heldAfterStop()
  if (!held) return
  if (
    expired(held, await storage.epoch(), now) ||
    (state?.start && state.start.startedAt >= held.requestedAt)
  ) {
    await storage.clearAfterStop()
    return
  }
  if (!state || state.startStop === 'pending') return
  try {
    if (await stillAllowed(db, held.job))
      await enqueue(
        // A Try again gets its whole start time from now.
        held.job.kind === 'create'
          ? { ...held.job, deadlineAt: now + WORKSPACE_START_TIME_LIMIT_MS }
          : held.job,
        held.intent,
      )
  } catch (error) {
    if (!(error instanceof HttpError)) throw error
  }
  await storage.clearAfterStop()
}
