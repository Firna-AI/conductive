import { advanceStartStop } from './durable-start-stop'
import { reconciledLifecycle } from './durable-reconciliation'
import { recoverLifecycleTurns } from './durable-turns'
import { isConfirmedStopped } from './confirmed-stop'
import {
  IDLE_MS,
  RESTORE_POLL_MS,
  type DurableLifecycleState,
  type LifecycleHooks,
  type LifecycleStorage,
} from './durable-types'

export async function advanceLifecycleAlarm(
  storage: LifecycleStorage,
  hooks: LifecycleHooks,
  initial: DurableLifecycleState,
  now: () => number,
  write: (state: DurableLifecycleState) => Promise<void>,
  keepalive: (state: DurableLifecycleState) => Promise<unknown>,
): Promise<void> {
  let state = initial
  if (state.state === 'archived') return
  if (state.startStop === 'pending') {
    await write(await advanceStartStop(state, hooks, now))
    return
  }
  state = await recoverLifecycleTurns(state, hooks)
  let stopPending = false
  const restoreDue =
    state.restoreWatchAt !== undefined && state.restoreWatchAt <= now()
  if (
    !state.runnerConnected &&
    !isConfirmedStopped(state) &&
    hooks.reconcile &&
    !(restoreDue && hooks.checkRestore && state.state !== 'error')
  ) {
    state = reconciledLifecycle(state, await hooks.reconcile(), now())
  }
  if (isConfirmedStopped(state)) {
    if (
      state.nextDiskKeepaliveAt !== null &&
      state.nextDiskKeepaliveAt <= now()
    ) {
      await keepalive(state)
      return
    }
  } else if (state.runningSessions.length) {
    state = reconciledLifecycle(state, await hooks.extendDeadline(), now())
  } else if (
    state.state !== 'error' &&
    state.lastActivityAt + IDLE_MS <= now()
  ) {
    const result = await hooks.stop()
    stopPending = result === 'pending'
    state = reconciledLifecycle(
      state,
      result === 'pending' ? undefined : (result ?? 'stopped'),
      now(),
    )
  }
  if (stopPending) state = { ...state, restoreWatchAt: undefined }
  if (
    restoreDue &&
    !stopPending &&
    !isConfirmedStopped(state) &&
    state.state !== 'error' &&
    hooks.checkRestore
  ) {
    const result = await hooks.checkRestore()
    state =
      result === 'pending' || result === 'done'
        ? {
            ...state,
            restoreWatchAt:
              result === 'pending' ? now() + RESTORE_POLL_MS : undefined,
          }
        : reconciledLifecycle(state, result, now())
  }
  await write(state)
  if (stopPending) await storage.setAlarm(now() + 30_000)
}
