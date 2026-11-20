/**
 * The runs of the automations. Each run opens a new workspace, so the state of
 * a run is the state of its workspace, once it has one. Before that, a run
 * is queued. A rule can skip a run, with its reason. A run fails with its
 * cause: a check before the create fails it before it has a workspace, and
 * a first start or a first turn that fails keeps its workspace (decisions
 * 130 D and 512 B). A run whose first turn the cloud computer stopped, with
 * no turn to continue its work, also fails and keeps its workspace. Each
 * run keeps the agent and the owner that it ran with, so a later change of
 * its automation changes no past run.
 */

import type { AgentKey } from './agents'
import type { Person } from './members'
import type {
  PullRequestEvent,
  Automation,
  ScheduleTrigger,
} from './automations'
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
 *
 * A run takes the outcome of the last turn of the chain of its first turn:
 * that turn, and each turn that continues its work after a stop of the
 * cloud computer (decision 6 D of the continuation plan). A chain that ends
 * with no turn to continue it fails the run, and the run keeps its
 * workspace. When the login of the owner is gone, the cause is
 * `agent-login`, as for the check. A stop less than 15 minutes after the
 * start of a turn that continued the work gives `cloud-computer-stopped`,
 * and so does a stop after the 30 days of the chain have passed. A message
 * in the workspace continues the work.
 */
type FailureCause =
  'agent-login' | 'github-access' | 'start' | 'turn' | 'cloud-computer-stopped'

/**
 * Why a rule skipped a pull request event (decision 506 C): its author, or
 * the account that caused it, is not a member and is not in "is".
 */
export type SkipReason =
  { who: 'author' | 'sender'; login: string } | { who: 'org' }

/** A member who left the org. A past run still names them. */
type FormerMember = { name: string }

/**
 * The agent and the person that a run acts with: the agent of its automation
 * and the owner of its automation when the run started. A later change of the
 * agent, or a move of the automation to another owner (decision 508 E),
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
 * they differ from those of its automation now.
 */
export type ListedRun = RunBase & Partial<RunActor> & RunOutcome

/** The runs of an automation, with the agent and the owner of the automation. */
export function runsOf(
  automation: Automation,
  runs: readonly ListedRun[],
): Run[] {
  return runs.map((run) => ({
    agent: automation.choice.agent,
    owner: automation.owner,
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
