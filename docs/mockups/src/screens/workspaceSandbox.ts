import { isPendingCommand } from '../components/chat/PendingCommand'
import type {
  SandboxNoticeState,
  SandboxPanelState,
} from '../components/workspace/sandboxNoticeState'
import { orgSuspendedReason } from '../components/orgs/suspension'
import { conversations } from '../fixtures/conversations'
import { startErrors } from '../fixtures/starting'
import { ownerSuspendedRefusal } from '../fixtures/startRefusals'
import type { ActivityStatus } from '../fixtures/workspaces'
import { isRunning } from './composerFor'
import type { WorkspaceState } from './workspaceState'

/**
 * The state of the open workspace, for its header and its row: the state
 * of its sandbox, or, on a ready sandbox, whether its agent waits for the
 * user or works.
 */
export function activityOf(state: WorkspaceState): ActivityStatus {
  // A refused start leaves the sandbox stopped.
  if (state.sandbox === 'refused') return 'stopped'
  if (state.sandbox !== 'ready') return state.sandbox
  if (conversations[state.conversation].some(isPendingCommand)) return 'input'
  return isRunning(state) ? 'working' : 'ready'
}

/**
 * The state that the screen draws. In a suspended org every start is
 * refused, so a sandbox that is not archived draws as refused.
 */
export function drawnState(state: WorkspaceState): WorkspaceState {
  const refused = state.org === 'suspended' && state.sandbox !== 'archived'
  return refused ? { ...state, sandbox: 'refused' } : state
}

/**
 * The bar in place of the composer while the sandbox is not running. A
 * refused start shows the words of its cause: the org or the owner. A
 * failed start carries the message that the app saved for it.
 */
export function sandboxNotice(
  state: WorkspaceState,
): SandboxNoticeState | undefined {
  switch (state.sandbox) {
    case 'refused':
      return {
        problem: 'refused',
        reason:
          state.org === 'suspended'
            ? orgSuspendedReason
            : ownerSuspendedRefusal,
      }
    case 'error':
      return { problem: 'error', message: startErrors[state.startError] }
    case 'stopped':
    case 'archived':
      return { problem: state.sandbox }
    case 'ready':
    case 'starting':
      return undefined
  }
}

/**
 * What the panels of the files and the tools show in place of their
 * content: the notice of the bar, with the words of a refusal, or the wait
 * of a start. A ready sandbox shows its content.
 */
export function panelState(
  state: WorkspaceState,
): SandboxPanelState | undefined {
  if (state.sandbox === 'starting') return { problem: 'starting' }
  return sandboxNotice(state)
}
