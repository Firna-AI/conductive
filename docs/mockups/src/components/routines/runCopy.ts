import { agents, type AgentKey } from '../../fixtures/agents'
import type { PersonKey } from '../../fixtures/members'
import type {
  FailedRun,
  RunState,
  RunTrigger,
  SkipReason,
} from '../../fixtures/routineRuns'
import { paths } from '../../paths'
import { activityPresentation } from '../workspaces/status'
import { eventLabels, scheduleLabels } from './triggerCopy'

/** Each state of a run in words. A workspace state keeps its own words. */
export const runStateLabels: Readonly<Record<RunState, string>> = {
  working: activityPresentation.working.label,
  input: activityPresentation.input.label,
  unread: activityPresentation.unread.label,
  ready: activityPresentation.ready.label,
  starting: activityPresentation.starting.label,
  stopped: activityPresentation.stopped.label,
  error: activityPresentation.error.label,
  archived: activityPresentation.archived.label,
  queued: 'Queued',
  failed: 'Failed',
  skipped: 'Skipped',
}

/** What started a run, such as "PR opened" or "Run now". */
export function runTriggerLabel(trigger: RunTrigger): string {
  switch (trigger.kind) {
    case 'schedule':
      return scheduleLabels[trigger.schedule]
    case 'run-now':
      return 'Run now'
    case 'pull-request':
      return eventLabels[trigger.event]
  }
}

/** The form of the account that connects each agent. */
const connectPaths: Readonly<Record<AgentKey, string>> = {
  claude: paths.connectClaude,
  codex: paths.connectCodex,
}

/** The cause of a failed run, and the one action that fixes it, if any. */
export type FailureCopy = {
  text: string
  action?: { label: string; to: string }
}

/**
 * The cause of a failed run in words, from the agent and the owner of the
 * run itself. So a later change of the agent of its routine, or a move of
 * the routine to another owner, changes no past row. The owner of the run
 * reads what to fix, with the one action that fixes it. Another member
 * reads whose login or access it is, because only that owner can fix it.
 * A failed start and a failed first turn kept their workspace, which has
 * Try again, so their rows offer no action. `viewer` is the person signed
 * in, or none where nobody can act, as in a suspended org.
 */
export function failureCopy(run: FailedRun, viewer?: PersonKey): FailureCopy {
  const agent = agents[run.agent].name
  const own = 'key' in run.owner && run.owner.key === viewer
  const whose = own ? 'Your' : `${run.owner.name}'s`
  switch (run.cause) {
    case 'agent-login':
      return {
        text: `${whose} ${agent} login isn't connected.`,
        action: own
          ? { label: `Connect ${agent}`, to: connectPaths[run.agent] }
          : undefined,
      }
    case 'github-access':
      return {
        text: `${whose} GitHub access expired.`,
        action: own
          ? { label: 'Sign in with GitHub', to: paths.signIn }
          : undefined,
      }
    case 'start':
      return { text: "The cloud computer didn't start." }
    case 'turn':
      return { text: run.message }
  }
}

/** The verb of the account that caused each pull request event. */
const senderVerbs = {
  opened: 'Opened',
  pushed: 'Pushed',
  merged: 'Merged',
} as const

/**
 * Why a run was skipped: the author of a pull request event, or the account
 * that caused it, is not a member of the org and is not in "is". Or the org
 * is suspended, so a queued run cannot start.
 */
export function skipCopy(
  skip: SkipReason,
  trigger: RunTrigger,
  org: string,
): string {
  if (skip.who === 'org') return `${org} is suspended.`
  const verb =
    skip.who === 'author' || trigger.kind !== 'pull-request'
      ? senderVerbs.opened
      : senderVerbs[trigger.event]
  return `${verb} by @${skip.login}, not a member of ${org}.`
}
