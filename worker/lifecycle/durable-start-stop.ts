import { withStartFailure } from './durable-start'
import { reconciledLifecycle } from './durable-reconciliation'
import type { DurableLifecycleState, LifecycleHooks } from './durable-types'

export function failedStartStop(
  state: DurableLifecycleState,
  error: NonNullable<DurableLifecycleState['error']>,
  cancelled: boolean,
  now: number,
): DurableLifecycleState {
  if (state.state === 'archived') return state
  return {
    ...withStartFailure(state, error, now),
    state: cancelled ? 'stopped' : 'error',
    error: cancelled ? state.error : error,
    startStop: 'pending',
    runnerConnected: false,
    startupPrepared: false,
    runningSessions: [],
    stoppedAt: null,
    nextDiskKeepaliveAt: null,
  }
}

export async function advanceStartStop(
  state: DurableLifecycleState,
  hooks: LifecycleHooks,
  now: () => number,
): Promise<DurableLifecycleState> {
  const result = (await hooks.stop()) ?? 'stopped'
  return result === 'pending'
    ? state
    : {
        ...reconciledLifecycle(state, result, now()),
        startStop: result,
      }
}
