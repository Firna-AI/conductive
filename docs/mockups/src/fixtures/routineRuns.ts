/**
 * The runs of the routines. Each run opens a new workspace, so the state of
 * a run is the state of its workspace, once it has one. Before that, a run
 * is queued. A rule can skip a run, with its reason. A run fails with its
 * cause: a check before the create fails it before it has a workspace, and
 * a first start or a first turn that fails keeps its workspace (decisions
 * 130 D and 512 B). Each run keeps the agent and the owner that it ran
 * with, so a later change of its routine changes no past run.
 */

import type { AgentKey } from './agents'
import type { Person } from './members'
import type { PullRequestEvent, Routine, ScheduleTrigger } from './routines'
import type { ActivityStatus } from './workspaces'

/** The states of a run that are not the state of a workspace. */
type RunOnlyState = 'queued' | 'failed' | 'skipped'

export type RunState = ActivityStatus | RunOnlyState

/** What started a run: a schedule, Run now, or a pull request event. */
export type RunTrigger =
  | { kind: 'schedule'; schedule: ScheduleTrigger['kind'] }
  | { kind: 'run-now' }
  | { kind: 'pull-request'; event: PullRequestEvent; number: number }

/**
 * Why a run failed, as the Worker stores it in the error code of the run.
 * The checks before the create fail a run whose owner has no login for the
 * agent of the run, or whose GitHub access expired, and such a run has no
 * workspace. A first start that failed keeps its workspace in its error
 * state, and a first turn that failed keeps its workspace with the error of
 * the turn. Try again in that workspace retries the start or the turn.
 */
type FailureCause = 'agent-login' | 'github-access' | 'start' | 'turn'

/**
 * Why a rule skipped a pull request event (decision 506 C): its author, or
 * the account that caused it, is not a member and is not in "is".
 */
export type SkipReason =
  { who: 'author' | 'sender'; login: string } | { who: 'org' }

/** A member who left the org. A past run still names them. */
type FormerMember = { name: string }

/**
 * The agent and the person that a run acts with: the agent of its routine
 * and the owner of its routine when the run started. A later change of the
 * agent, or a move of the routine to another owner (decision 508 E),
 * changes neither.
 */
type RunActor = { agent: AgentKey; owner: Person | FormerMember }

/** The trigger of a run, and its time as the lists show it, such as "5m". */
type RunBase = { key: string; trigger: RunTrigger; when: string }

/** The state of a run, with the cause of a failure or the reason of a skip. */
type RunOutcome =
  | { state: ActivityStatus }
  | { state: 'queued' }
  | { state: 'failed'; cause: Exclude<FailureCause, 'turn'> }
  | { state: 'failed'; cause: 'turn'; message: string }
  | { state: 'skipped'; skip: SkipReason }

export type Run = RunBase & RunActor & RunOutcome

export type FailedRun = Extract<Run, { state: 'failed' }>

/**
 * A run as a run list writes it. It names its agent or its owner only when
 * they differ from those of its routine now.
 */
export type ListedRun = RunBase & Partial<RunActor> & RunOutcome

/** The runs of a routine, with the agent and the owner of the routine. */
export function runsOf(routine: Routine, runs: readonly ListedRun[]): Run[] {
  return runs.map((run) => ({
    agent: routine.choice.agent,
    owner: routine.owner,
    ...run,
  }))
}

/**
 * The error of the failed first turn of a run, from the model provider. The
 * chat of its workspace shows it, and its row in the Runs list repeats it.
 */
export const turnError = 'Claude is overloaded right now.'

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
 * that is not in the state of a workspace keeps its state.
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
