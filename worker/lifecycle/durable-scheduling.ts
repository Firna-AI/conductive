import {
  IDLE_MS,
  LIFECYCLE_STATE_KEY,
  TURN_HEARTBEAT_MS,
  type DurableLifecycleState,
  type LifecycleHooks,
  type LifecycleStorage,
  type LifecyclePublisher,
} from './durable-types'
import { isConfirmedStopped } from './confirmed-stop'

export async function writeLifecycleState(
  storage: LifecycleStorage,
  hooks: LifecycleHooks,
  state: DurableLifecycleState,
  now: () => number,
  publish?: LifecyclePublisher,
): Promise<void> {
  await storage.put(LIFECYCLE_STATE_KEY, state)
  await scheduleLifecycleState(storage, hooks, state, now)
  await publishLifecycleState(storage, hooks, state, now, publish)
}

export async function publishLifecycleState(
  storage: LifecycleStorage,
  hooks: LifecycleHooks,
  state: DurableLifecycleState,
  now: () => number,
  publish?: LifecyclePublisher,
  keepEarlier = true,
): Promise<void> {
  const deadlineAt = state.diskRetentionDeadlineAt
  await storage.changedAlarm(
    deadlineAt !== undefined && deadlineAt > now()
      ? Math.min(now() + 30_000, deadlineAt)
      : now() + 30_000,
    keepEarlier,
  )
  if ((await hooks.changed(state, publish)) !== false)
    await storage.changedAlarm(null)
}

export async function scheduleLifecycleState(
  storage: LifecycleStorage,
  hooks: LifecycleHooks,
  state: DurableLifecycleState,
  now: () => number,
): Promise<void> {
  if (await hooks.startPending?.()) {
    await storage.deleteAlarm()
    return
  }
  if (state.startStop === 'pending') {
    await storage.setAlarm(now() + 30_000)
    return
  }
  const alarm = isConfirmedStopped(state)
    ? state.nextDiskKeepaliveAt
    : state.state === 'error'
      ? now() + 5_000
      : state.runningSessions.length
        ? now() + TURN_HEARTBEAT_MS
        : state.lastActivityAt + IDLE_MS
  if (alarm === null || state.state === 'archived') await storage.deleteAlarm()
  else {
    await storage.setAlarm(
      !state.runnerConnected && !isConfirmedStopped(state) && hooks.reconcile
        ? Math.min(alarm, now() + 5_000)
        : alarm,
    )
  }
}
