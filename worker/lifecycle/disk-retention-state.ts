import {
  LIFECYCLE_STATE_KEY,
  type DurableLifecycleState,
  type LifecycleHooks,
  type LifecycleStorage,
} from './durable-types'
import { WORKSPACE_START_TIME_LIMIT_MS } from './job-time-limit'
import type { RetentionCommandPort } from './retention-command'
import type { StartStep } from '../../src/shared/workspaces'
import { withStartStep } from './durable-start'
import { stepLabel } from './start-step-label'
import {
  finishRetentionAttempt,
  hasRetentionAttempt,
  isConfirmedStopped,
} from './confirmed-stop'

export async function advanceDiskRetentionState(
  storage: LifecycleStorage,
  hooks: LifecycleHooks,
  state: DurableLifecycleState,
  now: () => number,
  commit: (state: DurableLifecycleState) => Promise<void>,
) {
  if (!hasRetentionAttempt(state)) await commit(state)
  const deadlineAt =
    state.diskRetentionDeadlineAt ?? now() + WORKSPACE_START_TIME_LIMIT_MS
  if (
    state.diskRetentionDeadlineAt === undefined ||
    !state.diskRetentionCommand
  ) {
    state = {
      ...state,
      diskRetentionDeadlineAt: deadlineAt,
      diskRetentionCommand: state.diskRetentionCommand ?? {
        attempt: `retention-${deadlineAt}`,
        processId: null,
        stdoutOffset: 0,
        stderrOffset: 0,
      },
    }
    await storage.put(LIFECYCLE_STATE_KEY, state)
  }
  const command: RetentionCommandPort = {
    read: () => {
      if (!state.diskRetentionCommand)
        throw new Error('Missing retention command identity')
      return state.diskRetentionCommand
    },
    save: async (value) => {
      state = { ...state, diskRetentionCommand: value }
      await storage.put(LIFECYCLE_STATE_KEY, state)
    },
    softwareStep: async (status) => {
      state = retentionSoftwareStep(state, deadlineAt, status, now())
      await commit(state)
    },
  }
  const result = await hooks.keepalive(
    deadlineAt,
    command,
    isConfirmedStopped(state),
  )
  if (
    (result.done || result.error !== null) &&
    state.diskRetentionCommand?.phase === 'software' &&
    state.start?.steps.some(
      (step) => step.id === 'software' && step.state === 'running',
    )
  )
    state = retentionSoftwareStep(state, deadlineAt, 'failed', now())
  const error =
    state.startStop === 'stopped' && state.error
      ? state.error
      : result.error !== null
        ? { code: 'workspace_start_failed', message: result.error, log: null }
        : state.error
  const settled = result.done
    ? finishRetentionAttempt(state, result.stoppedAt)
    : state
  const next = {
    ...settled,
    error,
    nextDiskKeepaliveAt:
      result.done && !result.eligible ? null : settled.nextDiskKeepaliveAt,
  }
  await commit(next)
  if (
    !result.done ||
    (result.eligible &&
      result.stoppedAt === null &&
      next.nextDiskKeepaliveAt !== null &&
      next.nextDiskKeepaliveAt <= now())
  )
    await storage.setAlarm(
      now() >= deadlineAt ? now() + 5_000 : Math.min(now() + 5_000, deadlineAt),
    )
  return { state: next, done: result.done }
}

function retentionSoftwareStep(
  state: DurableLifecycleState,
  deadlineAt: number,
  status: StartStep['state'],
  now: number,
): DurableLifecycleState {
  const startedAt = deadlineAt - WORKSPACE_START_TIME_LIMIT_MS
  if (state.start?.startedAt !== startedAt) {
    state = {
      ...state,
      start: { kind: 'resume', startedAt, steps: [] },
    }
    state = withStartStep(
      state,
      'disk',
      'Resuming with your files as you left them',
      'running',
      startedAt,
    )
    state = withStartStep(
      state,
      'disk',
      'Resuming with your files as you left them',
      'completed',
      now,
    )
  }
  return withStartStep(state, 'software', stepLabel('software'), status, now)
}
