import {
  LIFECYCLE_STATE_KEY,
  TURN_HEARTBEAT_MS,
  type DurableLifecycleState,
  type LifecycleHooks,
  type LifecycleStorage,
  type LifecyclePublisher,
} from './durable-types'
import { isConfirmedStopped } from './confirmed-stop'
import { isFailedRestart, restartDeadline } from './durable-restart'

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
  await scheduleLifecycleState(storage, hooks, state, now)
  await publishLifecycleState(storage, hooks, state, now, publish)
}

async function publishLifecycleState(
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

export async function retryLifecyclePublication(
  storage: LifecycleStorage,
  hooks: LifecycleHooks,
  now: () => number,
): Promise<void> {
  const state = await storage.get(LIFECYCLE_STATE_KEY)
  if (state)
    await publishLifecycleState(storage, hooks, state, now, undefined, false)
  else await storage.changedAlarm(null)
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
    // A held start waits for this stop, so the check comes sooner.
    const held = (await hooks.startHeld?.()) ?? false
    await storage.setAlarm(now() + (held ? 5_000 : 30_000))
    return
  }
  const startPending = (await hooks.startPending?.()) ?? false
  const failedFirstStart =
    state.state === 'error' &&
    state.start?.kind === 'create' &&
    state.start.steps.some((step) => step.state === 'failed')
  const alarm =
    failedFirstStart && !startPending
      ? null
      : isConfirmedStopped(state)
        ? state.nextDiskKeepaliveAt
        : state.state === 'error' && !isFailedRestart(state)
          ? now() + 5_000
          : state.runningSessions.length
            ? now() + TURN_HEARTBEAT_MS
            : state.lastActivityAt + (await hooks.idleMs())
  if (alarm === null || state.state === 'archived') await storage.deleteAlarm()
  else {
    const next = Math.min(
      alarm,
      hooks.checkRestore ? (state.restoreWatchAt ?? Infinity) : Infinity,
      restartDeadline(state) ?? Infinity,
    )
    await storage.setAlarm(
      !state.runnerConnected && !isConfirmedStopped(state) && hooks.reconcile
        ? Math.min(next, now() + 5_000)
        : next,
    )
  }
}
