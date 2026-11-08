import {
  DISK_KEEPALIVE_MS,
  LIFECYCLE_STATE_KEY,
  type DurableLifecycleState,
  type LifecycleHooks,
  type LifecycleStorage,
} from './durable-types'
import { WORKSPACE_START_TIME_LIMIT_MS } from './job-time-limit'

export async function advanceDiskRetentionState(
  storage: LifecycleStorage,
  hooks: LifecycleHooks,
  state: DurableLifecycleState,
  now: () => number,
  commit: (state: DurableLifecycleState) => Promise<void>,
) {
  const deadlineAt =
    state.diskRetentionDeadlineAt ?? now() + WORKSPACE_START_TIME_LIMIT_MS
  if (state.diskRetentionDeadlineAt === undefined) {
    state = { ...state, diskRetentionDeadlineAt: deadlineAt }
    await storage.put(LIFECYCLE_STATE_KEY, state)
  }
  const result = await hooks.keepalive(deadlineAt)
  const error =
    result.error !== null
      ? { code: 'workspace_start_failed', message: result.error, log: null }
      : state.error
  const next = {
    ...state,
    error,
    diskRetentionDeadlineAt: result.done ? undefined : deadlineAt,
    stoppedAt: result.done ? now() : state.stoppedAt,
    nextDiskKeepaliveAt: result.done
      ? now() + DISK_KEEPALIVE_MS
      : state.nextDiskKeepaliveAt,
  }
  await commit(next)
  if (!result.done)
    await storage.setAlarm(
      now() >= deadlineAt ? now() + 5_000 : Math.min(now() + 5_000, deadlineAt),
    )
  return { state: next, done: result.done }
}
