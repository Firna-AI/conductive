import {
  eventLabels,
  scheduleLabels,
} from '../../../docs/mockups/src/components/routines/triggerCopy'
import { personName } from '../../app/people'
import { routes } from '../../app/router'
import type {
  Routine,
  RoutineRun,
  RoutineRunTrigger,
} from '../../shared/routines'
import { acceptedTermsSignInPath } from '../../shared/terms'
import { agentNames } from '../account/labels'

/** What started a run, such as "PR opened", "Daily", or "Run now". */
export function runTriggerLabel(trigger: RoutineRunTrigger): string {
  switch (trigger.kind) {
    case 'schedule':
      return scheduleLabels[trigger.schedule]
    case 'run-now':
      return 'Run now'
    case 'pull-request':
      return eventLabels[trigger.event]
  }
}

/**
 * The one action that fixes the cause of a failed run: an address of the
 * app, or the sign-in of the Worker, which leaves the app.
 */
interface FixAction {
  label: string
  to: string
  leavesApp: boolean
}

export interface FailureCopy {
  text: string
  action: FixAction | null
}

/**
 * The cause of a failed run in words. The owner reads what to fix, with
 * the action that fixes it. Another member reads whose login or access it
 * is, because only the owner can fix it. A start that failed removed its
 * workspace. A first turn that failed keeps its workspace, so its cause is
 * the error of the turn.
 */
export function failureCopy(
  run: RoutineRun,
  routine: Routine,
  ownerViews: boolean,
): FailureCopy {
  const agent = agentNames[routine.choice.agent]
  const whose = ownerViews ? 'Your' : `${personName(routine.owner)}'s`
  switch (run.error?.code) {
    case 'agent_login_required':
      return {
        text: `${whose} ${agent} login isn't connected.`,
        action: ownerViews
          ? {
              label: `Connect ${agent}`,
              to: routes.account(routine.choice.agent),
              leavesApp: false,
            }
          : null,
      }
    case 'github_reconnect_required':
      return {
        text: `${whose} GitHub access expired.`,
        action: ownerViews
          ? {
              label: 'Sign in with GitHub',
              to: acceptedTermsSignInPath(),
              leavesApp: true,
            }
          : null,
      }
  }
  if (run.workspaceId === null) {
    return { text: "The cloud computer didn't start.", action: null }
  }
  return { text: run.error?.message || 'The first turn failed.', action: null }
}

/**
 * Why a run was skipped. A suspended org names the org. Each other reason
 * is the words of the API, such as an author outside the org.
 */
export function skipCopy(run: RoutineRun, orgName: string): string {
  if (run.error?.code === 'org_suspended') return `${orgName} is suspended.`
  return run.error?.message || 'This run was skipped.'
}
