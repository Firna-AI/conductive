import { advanceStartStop } from './durable-start-stop'
import { reconciledLifecycle } from './durable-reconciliation'
import { recoverLifecycleTurns } from './durable-turns'
import { isConfirmedStopped } from './confirmed-stop'
import {
  canRestartLifecycle,
  expiredRestartLifecycle,
  isFailedRestart,
} from './durable-restart'
import {
  RESTORE_POLL_MS,
  SHORTEST_IDLE_MS,
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
): Promise<boolean> {
  let state = initial
  if (state.state === 'archived') return false
  if (state.startStop === 'pending') {
    await write(await advanceStartStop(state, hooks, now))
    return false
  }
  if (state.automaticRestartAt !== undefined) {
    const expired = expiredRestartLifecycle(state, now())
    if (expired !== state) {
      await write(expired)
      return false
    }
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
  state = expiredRestartLifecycle(state, now())
  if (isConfirmedStopped(state)) {
    if (
      state.nextDiskKeepaliveAt !== null &&
      state.nextDiskKeepaliveAt <= now()
    ) {
      await keepalive(state)
      return false
    }
  } else if (state.runningSessions.length) {
    state = reconciledLifecycle(state, await hooks.extendDeadline(), now())
  } else if (state.state !== 'error' || isFailedRestart(state)) {
    const idleMs = await hooks.idleMs()
    if (state.lastActivityAt + idleMs <= now()) {
      const result = await hooks.stop()
      stopPending = result === 'pending'
      state = reconciledLifecycle(
        state,
        result === 'pending' ? undefined : (result ?? 'stopped'),
        now(),
      )
    } else if (
      state.runnerConnected &&
      !restoreDue &&
      state.lastActivityAt + SHORTEST_IDLE_MS <= now()
    ) {
      // A longer stop time: the provider auto-stop still holds the old time.
      state = reconciledLifecycle(state, await hooks.extendDeadline(), now())
    }
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
  const canRestart =
    !stopPending && !state.runnerConnected && canRestartLifecycle(state)
  if (canRestart && state.runnerDisconnectedAt === undefined)
    state = { ...state, runnerDisconnectedAt: now() }
  await write(state)
  if (stopPending) await storage.setAlarm(now() + 30_000)
  return canRestart
}
