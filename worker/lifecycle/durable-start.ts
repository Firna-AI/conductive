import type { StartStep } from '../../src/shared/workspaces'
import { RESTORE_POLL_MS, type DurableLifecycleState } from './durable-types'

export function withPreparedStart(
  state: DurableLifecycleState,
  now: number,
): DurableLifecycleState {
  if (state.state === 'stopped' || state.state === 'archived') return state
  return {
    ...state,
    startupPrepared: true,
    restoreWatchAt: state.startupPrepared
      ? state.restoreWatchAt
      : now + RESTORE_POLL_MS,
    state: state.runnerConnected
      ? state.runningSessions.length
        ? 'working'
        : 'ready'
      : 'starting',
  }
}

export function withStartStep(
  state: DurableLifecycleState,
  id: string,
  label: string,
  status: StartStep['state'],
  now: number,
): DurableLifecycleState {
  if (!state.start) return state
  const old = state.start.steps.find((step) => step.id === id)
  const step: StartStep = {
    id,
    label,
    state: status,
    startedAt: old?.startedAt ?? now,
    completedAt:
      status === 'running'
        ? null
        : old?.state === status && old.completedAt !== null
          ? old.completedAt
          : now,
  }
  return {
    ...state,
    start: {
      ...state.start,
      steps: old
        ? state.start.steps.map((entry) => (entry.id === id ? step : entry))
        : [...state.start.steps, step],
    },
  }
}

export function withReportedStart(
  state: DurableLifecycleState,
  start: NonNullable<DurableLifecycleState['start']>,
): DurableLifecycleState {
  if (state.start && state.start.kind !== start.kind) return state
  const steps = new Map(
    (state.start?.steps ?? []).map((step) => [step.id, step]),
  )
  for (const step of start.steps) steps.set(step.id, step)
  return {
    ...state,
    start: {
      ...start,
      startedAt: state.start?.startedAt ?? start.startedAt,
      steps: [...steps.values()],
    },
  }
}

export function withStartFailure(
  state: DurableLifecycleState,
  error: DurableLifecycleState['error'],
  now: number,
): DurableLifecycleState {
  if (state.state === 'stopped' || state.state === 'archived') return state
  return {
    ...state,
    state: 'error',
    error,
    start: state.start
      ? {
          ...state.start,
          steps: state.start.steps.map((step) =>
            step.state === 'running'
              ? { ...step, state: 'failed', completedAt: now }
              : step,
          ),
        }
      : null,
  }
}

export function withCreateFailure(
  state: DurableLifecycleState,
  error: DurableLifecycleState['error'],
  now: number,
): DurableLifecycleState {
  if (state.state === 'stopped' || state.state === 'archived') return state
  const failed = withStartFailure(
    state.start
      ? state
      : {
          ...state,
          start: { kind: 'create', startedAt: now, steps: [] },
        },
    error,
    now,
  )
  return failed.start?.steps.some((step) => step.state === 'failed')
    ? failed
    : withStartStep(
        failed,
        'start',
        'Starting the cloud computer',
        'failed',
        now,
      )
}
