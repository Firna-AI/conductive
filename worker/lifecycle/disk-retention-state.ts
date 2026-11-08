import {
  DISK_KEEPALIVE_MS,
  LIFECYCLE_STATE_KEY,
  type DurableLifecycleState,
  type LifecycleHooks,
  type LifecycleStorage,
} from './durable-types'
import { WORKSPACE_START_TIME_LIMIT_MS } from './job-time-limit'
import type { RetentionCommandPort } from './retention-command'

export async function advanceDiskRetentionState(
  storage: LifecycleStorage,
  hooks: LifecycleHooks,
  state: DurableLifecycleState,
  now: () => number,
  commit: (state: DurableLifecycleState) => Promise<void>,
) {
  const deadlineAt =
    state.diskRetentionDeadlineAt ?? now() + WORKSPACE_START_TIME_LIMIT_MS
  if (
    state.diskRetentionDeadlineAt === undefined ||
    !state.diskRetentionCommand
  ) {
    state = {
      ...state,
      diskRetentionDeadlineAt: deadlineAt,
      diskRetentionCommand: state.diskRetentionCommand ?? {
        attempt: `retention-${deadlineAt}`,
        processId: null,
        stdoutOffset: 0,
        stderrOffset: 0,
      },
    }
    await storage.put(LIFECYCLE_STATE_KEY, state)
  }
  const command: RetentionCommandPort = {
    read: () => {
      if (!state.diskRetentionCommand)
        throw new Error('Missing retention command identity')
      return state.diskRetentionCommand
    },
    save: async (value) => {
      state = { ...state, diskRetentionCommand: value }
      await storage.put(LIFECYCLE_STATE_KEY, state)
    },
  }
  const result = await hooks.keepalive(deadlineAt, command)
  const error =
    result.error !== null
      ? { code: 'workspace_start_failed', message: result.error, log: null }
      : state.error
  const next = {
    ...state,
    error,
    diskRetentionDeadlineAt: result.done ? undefined : deadlineAt,
    diskRetentionCommand: result.done ? undefined : state.diskRetentionCommand,
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
