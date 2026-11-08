import { advanceStartStop } from './durable-start-stop'
import { reconciledLifecycle } from './durable-reconciliation'
import {
  IDLE_MS,
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
  let stopPending = false
  if (!state.runnerConnected && state.state !== 'stopped' && hooks.reconcile) {
    state = reconciledLifecycle(state, await hooks.reconcile(), now())
  }
  if (state.state === 'stopped' || state.startStop === 'stopped') {
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
  await write(state)
  if (stopPending) await storage.setAlarm(now() + 30_000)
}
