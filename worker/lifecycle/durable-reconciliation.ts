import type {
  DurableLifecycleState,
  LifecycleReconciliation,
} from './durable-types'
import { finishRetentionAttempt, isConfirmedStopped } from './confirmed-stop'

/** Reuse each confirmed provider state before a stored runner flag can hide it. */
export function reconciledLifecycle(
  state: DurableLifecycleState,
  remote: LifecycleReconciliation | void,
  now: number,
): DurableLifecycleState {
  if (remote === 'stopped') {
    const stoppedAt =
      state.diskRetentionCommand?.stopRequestedAt ??
      (isConfirmedStopped(state) ? null : now)
    return {
      ...finishRetentionAttempt(state, stoppedAt),
      state: state.startStop && state.error ? 'error' : 'stopped',
      startStop: state.startStop ? 'stopped' : undefined,
      runningSessions: [],
      runnerConnected: false,
    }
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
