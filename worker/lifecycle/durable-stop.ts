import { reconciledLifecycle } from './durable-reconciliation'
import type { DurableLifecycleState } from './durable-types'

export function appStoppingLifecycle(
  state: DurableLifecycleState,
  now: number,
): DurableLifecycleState {
  return {
    ...state,
    appStop: state.appStop ?? { at: now },
    providerStop: undefined,
    restoreWatchAt: undefined,
  }
}

export function appStoppedLifecycle(
  state: DurableLifecycleState,
  now: number,
): DurableLifecycleState {
  return state.state === 'archived'
    ? state
    : reconciledLifecycle(appStoppingLifecycle(state, now), 'stopped', now)
}

export function isProviderStop(state: DurableLifecycleState): boolean {
  return (
    state.state === 'stopped' &&
    state.appStop === undefined &&
    state.providerStop !== undefined &&
    state.providerStop.at === state.stoppedAt
  )
}
