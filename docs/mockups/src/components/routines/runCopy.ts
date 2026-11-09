import { agents, type AgentKey } from '../../fixtures/agents'
import type {
  FailureCause,
  RunState,
  RunTrigger,
  SkipReason,
} from '../../fixtures/routineRuns'
import type { Routine } from '../../fixtures/routines'
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
 * The cause of a failed run in words. The owner reads what to fix. Another
 * member reads whose login it is, because only the owner can fix it.
 */
export function failureCopy(
  cause: FailureCause,
  routine: Routine,
  ownerViews: boolean,
): FailureCopy {
  const agent = agents[routine.choice.agent].name
  const whose = ownerViews ? 'Your' : `${routine.owner.name}'s`
  switch (cause) {
    case 'agent-login':
      return {
        text: `${whose} ${agent} login isn't connected.`,
        action: ownerViews
          ? {
              label: `Connect ${agent}`,
              to: connectPaths[routine.choice.agent],
            }
          : undefined,
      }
    case 'github-access':
      return {
        text: `${whose} GitHub access expired.`,
        action: ownerViews
          ? { label: 'Sign in with GitHub', to: paths.signIn }
          : undefined,
      }
    case 'start':
      return { text: "The cloud computer didn't start." }
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
