import type { MessageSender } from '../../shared/generated/MessageSender'
import {
  eventLabels,
  scheduleLabels,
} from '../../../docs/mockups/src/components/automations/triggerCopy'
import { personName } from '../../app/people'
import { routes } from '../../app/router'
import { API_PATHS } from '../../shared/api'
import type {
  AutomationRun,
  AutomationRunTrigger,
} from '../../shared/automations'
import { agentNames } from '../account/labels'

/** What started a run, such as "PR opened", "Daily", or "Run now". */
export function runTriggerLabel(trigger: AutomationRunTrigger): string {
  switch (trigger.kind) {
    case 'schedule':
      return scheduleLabels[trigger.schedule]
    case 'run-now':
      return 'Run now'
    case 'pull-request':
      return eventLabels[trigger.event]
  }
}

/** The code that a run stores when the cloud computer of its workspace did not start. */
const startFailed = 'workspace_start_failed'

/**
 * The code that a run stores when a provider stop ended the chain of its
 * first turn, and no turn continues the work.
 */
const cloudComputerStopped = 'cloud_computer_stopped'

/**
 * The state whose mark a run shows. A failed run keeps the mark of its
 * failure, also after Try again in its workspace, because the run keeps its
 * failed outcome. A run whose first start failed shows the cross of its
 * workspace in the error state. Each other failure shows the slash of a
 * failed run: after a failed turn or a provider stop, the mark of the
 * workspace would hide the failure.
 */
export function runMark(run: AutomationRun): AutomationRun['state'] {
  return run.state === 'failed' && run.error?.code === startFailed
    ? 'error'
    : run.state
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
 * The words that the Worker stored with the failure of a run, with no
 * action. A run without them failed in its first turn.
 */
function storedCopy(run: AutomationRun): FailureCopy {
  return { text: run.error?.message || 'The first turn failed.', action: null }
}

/** "Your" for the owner of the run, and the name of the owner for anyone else. */
function whose(owner: MessageSender, own: boolean): string {
  return own ? 'Your' : `${personName(owner)}'s`
}

/**
 * The words of a run whose chain a provider stop ended with no turn to
 * continue it. They name what stopped, not the limit that ended the turns,
 * as the stopped line of the chat does. A stopped turn has no Try again, so
 * a person who can act also reads that a message in the workspace continues
 * the work. Where nobody can act, the words stop at what stopped.
 */
function stoppedCopy(viewer: string | null): FailureCopy {
  const stopped = 'The cloud computer stopped before the agent finished.'
  return {
    text:
      viewer === null
        ? stopped
        : `${stopped} Send a message in the workspace to continue.`,
    action: null,
  }
}

/**
 * Whether a run failed for a missing login, so that it reads as a failed
 * check of the login: the check before the create, which leaves the run
 * with no workspace, or the end of a chain that a provider stop ended while
 * the login of the session was gone. A first turn whose sender lost access
 * stores the same code with a workspace and no source, and keeps its own
 * words.
 */
function loginMissing(run: AutomationRun): boolean {
  const { error } = run
  return (
    error?.code === 'agent_login_required' &&
    (run.workspaceId === null || error.source === 'provider_stop')
  )
}

/**
 * The cause of a failed run in words, from the run alone: its stored error,
 * its agent, and its owner. So a later change of the agent of its automation,
 * or a move of the automation to another owner, changes no past row. The
 * owner of the run reads what to fix, with the one action that fixes it.
 * Another member reads whose login or access it is, because only that
 * owner can fix it. `viewer` is the ID of the person signed in, or null
 * where nobody can act, as in a suspended org.
 *
 * - A check of the agent login or of the GitHub access failed the run
 *   before it had a workspace.
 * - A first start that failed kept its workspace, whose Try again starts
 *   it again. Its words come from its stored code.
 * - A first turn that failed kept its workspace too, so its cause is the
 *   stored error of the turn. A first turn whose sender lost access, such
 *   as after the owner left the org, stores the code of a missing login
 *   with its own words.
 * - A provider stop that ended the chain of the first turn, with no turn to
 *   continue it, kept the workspace too. A login that was gone at that stop
 *   reads as a failed check of the login, with its action. Each other such
 *   end reads as a stopped cloud computer, with no action.
 * - A run from before runs kept their agent and owner shows the stored
 *   words of a failed check, with no action.
 */
export function failureCopy(
  run: AutomationRun,
  viewer: string | null,
): FailureCopy {
  const code = run.error?.code
  if (code === startFailed) {
    return { text: "The cloud computer didn't start.", action: null }
  }
  if (code === cloudComputerStopped) return stoppedCopy(viewer)
  const { agent, owner } = run
  if (agent === null || owner === null) return storedCopy(run)
  const own = owner.id === viewer
  if (loginMissing(run)) {
    const name = agentNames[agent]
    return {
      text: `${whose(owner, own)} ${name} login isn't connected.`,
      action: own
        ? {
            label: `Connect ${name}`,
            to: routes.account(agent),
            leavesApp: false,
          }
        : null,
    }
  }
  if (code === 'github_reconnect_required') {
    return {
      text: `${whose(owner, own)} GitHub access expired.`,
      action: own
        ? {
            label: 'Sign in with GitHub',
            to: API_PATHS.githubSignIn,
            leavesApp: true,
          }
        : null,
    }
  }
  return storedCopy(run)
}

/** The verb of the account that caused each pull request event. */
const senderVerbs = {
  opened: 'Opened',
  pushed: 'Pushed',
  merged: 'Merged',
} as const

/**
 * Why a run was skipped. An account outside the org shows by its login, so
 * the owner knows which account to add to "Author is". The author opened
 * the pull request. The sender caused the event: it opened, pushed to, or
 * merged the pull request. A suspended org names the org. Each other
 * reason, and an older skip without a login, is the words of the API.
 */
export function skipCopy(run: AutomationRun, orgName: string): string {
  const code = run.error?.code
  if (code === 'org_suspended') return `${orgName} is suspended.`
  const { trigger } = run
  if (trigger.kind === 'pull-request' && trigger.skipLogin) {
    const outside = `@${trigger.skipLogin}, not a member of ${orgName}.`
    if (code === 'author_not_allowed') return `Opened by ${outside}`
    if (code === 'sender_not_allowed') {
      return `${senderVerbs[trigger.event]} by ${outside}`
    }
  }
  return run.error?.message || 'This run was skipped.'
}
