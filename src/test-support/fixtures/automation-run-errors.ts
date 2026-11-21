/**
 * The errors of the runs of the mockups, as the Worker stores them: the
 * cause of a failed run, and the reason of a skipped run.
 */

import type {
  FailedRun,
  SkipReason,
} from '../../../docs/mockups/src/fixtures/automationRuns'
import type { AutomationRun } from '../../shared/automations'

type RunError = NonNullable<AutomationRun['error']>

/** Each cause of a failed run, as the Worker stores it. */
const failures: Readonly<
  Record<Exclude<FailedRun['cause'], 'turn'>, RunError>
> = {
  'agent-login': {
    code: 'agent_login_required',
    message: 'Connect Claude to run this automation.',
  },
  'github-access': {
    code: 'github_reconnect_required',
    message: 'GitHub access expired. Sign in with GitHub again.',
  },
  start: {
    code: 'workspace_start_failed',
    message: 'The cloud computer could not start. Try again.',
  },
  'cloud-computer-stopped': {
    code: 'cloud_computer_stopped',
    message:
      'The cloud computer stopped before the agent finished. Send a message in the workspace to continue.',
    source: 'provider_stop',
  },
}

/**
 * The mockup runs whose chain a provider stop ended while the login of the
 * session was gone (provider stop decision 6). The mockups give them the
 * cause of a failed check of the login, so only their key marks them.
 */
const loginGoneAtStop: ReadonlySet<string> = new Set(['pushed-481'])

/**
 * The failure of a run whose login was gone at a provider stop, as the
 * Worker stores it: the code of a missing login, with its own words and the
 * source of the failure.
 */
const lostLogin: RunError = {
  code: 'agent_login_required',
  message: 'Connect the agent login again to continue in the workspace.',
  source: 'provider_stop',
}

/** Whether the login of a run was gone at the provider stop that ended its chain. */
function lostAtStop(run: FailedRun): boolean {
  return run.cause === 'agent-login' && loginGoneAtStop.has(run.key)
}

/**
 * Whether a check before the create failed the run, so that it has no
 * workspace: the check of the agent login, or of the GitHub access.
 */
export function checkFailed(run: FailedRun): boolean {
  return (
    (run.cause === 'agent-login' || run.cause === 'github-access') &&
    !lostAtStop(run)
  )
}

/** The error of a failed run, as the Worker stores it. */
export function failureOf(run: FailedRun): RunError {
  if (run.cause === 'turn') {
    return { code: 'agent_unavailable', message: run.message }
  }
  return lostAtStop(run) ? lostLogin : failures[run.cause]
}

/** Each reason of a skipped run, as the Worker stores it. */
export function skipOf(skip: SkipReason): RunError {
  switch (skip.who) {
    case 'author':
      return {
        code: 'author_not_allowed',
        message:
          'The pull request author is outside the org and is not in Author is.',
      }
    case 'sender':
      return {
        code: 'sender_not_allowed',
        message: 'The event sender is outside the org and is not in Author is.',
      }
    case 'org':
      return { code: 'org_suspended', message: 'The org is suspended.' }
  }
}
