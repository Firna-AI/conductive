import { reconciledLifecycle } from './durable-reconciliation'
import { recoverLifecycleTurns } from './durable-turns'
import {
  DISK_KEEPALIVE_MS,
  IDLE_MS,
  type DurableLifecycleState,
  type LifecycleHooks,
  type LifecycleStorage,
} from './durable-types'

export async function advanceLifecycleAlarm(
  state: DurableLifecycleState | undefined,
  hooks: LifecycleHooks,
  storage: LifecycleStorage,
  now: () => number,
  write: (state: DurableLifecycleState) => Promise<void>,
): Promise<void> {
  if (!state || state.state === 'archived') return
  state = await recoverLifecycleTurns(state, hooks)
  let stopPending = false
  if (!state.runnerConnected && state.state !== 'stopped' && hooks.reconcile)
    state = reconciledLifecycle(state, await hooks.reconcile(), now())
  if (state.state === 'stopped') {
    if (
      state.nextDiskKeepaliveAt !== null &&
      state.nextDiskKeepaliveAt <= now()
    ) {
      if ((await hooks.keepalive()) === false) {
        await storage.setAlarm(now() + 5_000)
        return
      }
      state = {
        ...state,
        stoppedAt: now(),
        nextDiskKeepaliveAt: now() + DISK_KEEPALIVE_MS,
      }
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
  await write(state)
  if (stopPending) await storage.setAlarm(now() + 30_000)
}
