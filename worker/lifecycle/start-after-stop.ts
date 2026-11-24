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
import { WORKSPACE_START_TIME_LIMIT_MS } from './job-time-limit'
import { taskWorkspaceTransaction } from './workspace-task-alarms'

export const START_AFTER_STOP_KEY = 'lifecycle:start-after-stop'

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
    /** Reads and deletes the held start. */
    takeAfterStop: (): Promise<StartAfterStop | undefined> =>
      storage.transaction(async (transaction) => {
        const held = await transaction.get(
          'startAfterStop',
          START_AFTER_STOP_KEY,
        )
        if (!held) return undefined
        await transaction.delete(START_AFTER_STOP_KEY)
        return { ...held, job: readStartJob(held.job) }
      }),
  }
}

/**
 * Queues the held start once the stop ends. An Archive after the request,
 * or a wait past the start time limit, drops it. The queue repeats every
 * admission check, so a start that is no longer allowed starts nothing.
 */
export async function queueStartAfterStop(
  storage: Pick<StartJobStorage, 'takeAfterStop' | 'epoch'>,
  state: DurableLifecycleState | undefined,
  now: number,
  enqueue: (
    job: WorkspaceStartJob,
    intent: WorkspaceStartIntent,
  ) => Promise<boolean>,
): Promise<void> {
  if (!state || state.startStop === 'pending') return
  const held = await storage.takeAfterStop()
  if (
    !held ||
    held.epoch !== (await storage.epoch()) ||
    now >= held.requestedAt + WORKSPACE_START_TIME_LIMIT_MS
  )
    return
  await enqueue(held.job, held.intent)
}
