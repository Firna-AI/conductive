import {
  DISK_KEEPALIVE_MS,
  type DurableLifecycleState,
  type LifecycleReconciliation,
} from './durable-types'

/** Reuse each confirmed provider state before a stored runner flag can hide it. */
export function reconciledLifecycle(
  state: DurableLifecycleState,
  remote: LifecycleReconciliation | void,
  now: number,
): DurableLifecycleState {
  if (remote === 'stopped')
    return {
      ...state,
      state: state.startStop && state.error ? 'error' : 'stopped',
      startStop: state.startStop ? 'stopped' : undefined,
      runningSessions: [],
      runnerConnected: false,
      stoppedAt: now,
      nextDiskKeepaliveAt: now + DISK_KEEPALIVE_MS,
    }
  if (remote === 'error')
    return {
      ...state,
      state: 'error',
      runningSessions: [],
      runnerConnected: false,
      error:
        state.startStop && state.error
          ? state.error
          : {
              code: 'sandbox_failed',
              message: 'The cloud computer stopped with an error. Try again.',
              log: null,
            },
    }
  return state
}
