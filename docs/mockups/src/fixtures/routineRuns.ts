/**
 * The runs of the routines. Each run opens a new workspace, so the state of
 * a run is the state of its workspace, once it has one. Before that, a run
 * is queued. A run that never got a workspace failed with its cause, or a
 * rule skipped it with its reason.
 */

import type { PullRequestEvent, ScheduleTrigger } from './routines'
import type { ActivityStatus } from './workspaces'

/** The states of a run that has no workspace: before it, or in place of it. */
type RunOnlyState = 'queued' | 'failed' | 'skipped'

export type RunState = ActivityStatus | RunOnlyState

/** What started a run: a schedule, Run now, or a pull request event. */
export type RunTrigger =
  | { kind: 'schedule'; schedule: ScheduleTrigger['kind'] }
  | { kind: 'run-now' }
  | { kind: 'pull-request'; event: PullRequestEvent; number: number }

/**
 * Why a run failed before it had a workspace: the owner has no agent login
 * for the model, the GitHub access of the owner expired, or the cloud
 * computer did not start, so the app removed the new workspace.
 */
export type FailureCause = 'agent-login' | 'github-access' | 'start'

/**
 * Why a rule skipped a pull request event (decision 506 C): its author, or
 * the account that caused it, is not a member and is not in "is".
 */
export type SkipReason =
  { who: 'author' | 'sender'; login: string } | { who: 'org' }

type RunBase = { key: string; trigger: RunTrigger; when: string }

export type Run =
  | (RunBase & { state: ActivityStatus })
  | (RunBase & { state: 'queued' })
  | (RunBase & { state: 'failed'; cause: FailureCause })
  | (RunBase & { state: 'skipped'; skip: SkipReason })

/** The trigger of a run that a pull request event started. */
export function pr(event: PullRequestEvent, number: number): RunTrigger {
  return { kind: 'pull-request', event, number }
}

/**
 * The state of a workspace after the operator suspended its org: the
 * suspension stopped its cloud computer, unless it was archived.
 */
export function workspaceAfterSuspension(
  state: ActivityStatus,
): ActivityStatus {
  return state === 'archived' ? 'archived' : 'stopped'
}

/**
 * The state that a run shows after the operator suspended its org. A run
 * without a workspace keeps its state.
 */
export function stateAfterSuspension(state: RunState): RunState {
  switch (state) {
    case 'queued':
    case 'failed':
    case 'skipped':
      return state
    default:
      return workspaceAfterSuspension(state)
  }
}
