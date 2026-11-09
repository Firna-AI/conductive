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
  if (
    state.restoreWatchAt !== undefined &&
    (state.state === 'stopped' ||
      state.state === 'error' ||
      state.state === 'archived' ||
      state.startStop !== undefined)
  )
    state = { ...state, restoreWatchAt: undefined }
  await storage.put(LIFECYCLE_STATE_KEY, state)
  if (state.startStop === 'pending') {
    await storage.setAlarm(now() + 30_000)
    await hooks.changed(state, publish)
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
    const startPending = (await hooks.startPending?.()) ?? false
    const next = Math.min(
      alarm,
      hooks.checkRestore ? (state.restoreWatchAt ?? Infinity) : Infinity,
    )
    await storage.setAlarm(
      startPending
        ? Math.min(next, now() + 1_000)
        : !state.runnerConnected &&
            !isConfirmedStopped(state) &&
            hooks.reconcile
          ? Math.min(next, now() + 5_000)
          : next,
    )
  }
  await hooks.changed(state, publish)
}
