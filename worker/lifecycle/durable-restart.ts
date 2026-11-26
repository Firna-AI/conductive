import {
  restartableStates,
  restartCopy,
} from '../../src/ui/components/workspace/restartCopy'
import { HttpError } from '../http'
import type { DurableLifecycleState } from './durable-types'

/** The runner must be ready again within this time after Restart. */
export const SOFTWARE_RESTART_LIMIT_MS = 3 * 60 * 1_000

export function workspaceNotRunning(): HttpError {
  return new HttpError(
    409,
    'workspace_not_running',
    'The cloud computer is not running. Open the workspace and try again.',
  )
}

export function canRestartLifecycle(state: DurableLifecycleState): boolean {
  return restartableStates.has(state.state) && state.startStop === undefined
}

/**
 * Restart begins: the workspace shows Starting until the runner is ready
 * again, as `readyLifecycle` says, or until the time limit ends it.
 */
export function restartingLifecycle(
  state: DurableLifecycleState,
  workspaceId: string,
  now: number,
): DurableLifecycleState {
  if (state.workspaceId !== workspaceId)
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  if (!canRestartLifecycle(state)) throw workspaceNotRunning()
  return {
    ...state,
    state: 'starting',
    softwareRestartAt: now,
    lastActivityAt: Math.max(state.lastActivityAt, now),
    error: null,
  }
}

/**
 * A failed restart leaves its cloud computer running, so that Try again can
 * use it. Unlike the other errors, it keeps the idle stop.
 */
export function isFailedRestart(state: DurableLifecycleState): boolean {
  return state.state === 'error' && state.error?.code === 'restart_failed'
}

/** A restart that failed, or did not end in time, shows the error state. */
export function failedRestartLifecycle(
  state: DurableLifecycleState,
): DurableLifecycleState {
  if (state.softwareRestartAt === undefined || state.state !== 'starting')
    return state
  return {
    ...state,
    state: 'error',
    softwareRestartAt: undefined,
    automaticRestartSubmitted: undefined,
    error: { code: 'restart_failed', message: restartCopy.failed, log: null },
  }
}

export function requiresFreshRunnerReady(
  state: DurableLifecycleState | undefined,
): boolean {
  return (
    state?.state === 'starting' &&
    state.automaticRestartSubmitted === true &&
    state.softwareRestartAt !== undefined &&
    state.automaticRestartAt === state.softwareRestartAt
  )
}

/** The time when the alarm ends a restart whose runner is not back. */
export function restartDeadline(state: DurableLifecycleState): number | null {
  return state.softwareRestartAt === undefined || state.state !== 'starting'
    ? null
    : state.softwareRestartAt + SOFTWARE_RESTART_LIMIT_MS
}

export function expiredRestartLifecycle(
  state: DurableLifecycleState,
  now: number,
): DurableLifecycleState {
  const deadline = restartDeadline(state)
  return deadline !== null && deadline <= now
    ? failedRestartLifecycle(state)
    : state
}
