import { isPendingCommand } from '../components/chat/PendingCommand'
import type {
  SandboxNoticeState,
  SandboxPanelState,
} from '../components/workspace/sandboxNoticeState'
import { orgSuspendedReason } from '../components/orgs/suspension'
import { conversations } from '../fixtures/conversations'
import { startErrors } from '../fixtures/starting'
import { ownerSuspendedRefusal } from '../fixtures/startRefusals'
import type { WorkspaceStatus } from '../fixtures/workspaces'
import { isRunning } from './composerFor'
import { isImported } from './importedWorkspace'
import { isNew } from './workspaceTabs'
import type { WorkspaceState } from './workspaceState'

/**
 * The state of the open workspace, for its header and its row: the state
 * of its sandbox, or, on a ready sandbox, whether its agent waits for the
 * user or works. A workspace from Conductor is inactive until its
 * activation.
 */
export function activityOf(state: WorkspaceState): WorkspaceStatus {
  // A refused start leaves the sandbox stopped.
  if (state.sandbox === 'refused') return 'stopped'
  if (state.sandbox === 'archived-inactive') return 'archived'
  if (state.sandbox !== 'ready') return state.sandbox
  if (conversations[state.conversation].some(isPendingCommand)) return 'input'
  return isRunning(state) ? 'working' : 'ready'
}

/**
 * The state that the screen draws. In a suspended org every start is
 * refused, so a sandbox that is not archived draws as refused.
 */
export function drawnState(state: WorkspaceState): WorkspaceState {
  const refused = state.org === 'suspended' && !isArchived(state)
  return refused ? { ...state, sandbox: 'refused' } : state
}

/**
 * The workspace is archived: its cloud computer is deleted, or, for a
 * workspace from Conductor that was never activated, it never had one.
 */
export function isArchived(state: WorkspaceState): boolean {
  return state.sandbox === 'archived' || state.sandbox === 'archived-inactive'
}

/**
 * The new workspace of the create flow before its first successful start:
 * each of its messages still waits in the queue. Its error is a failed
 * first start. A later error is a failed resume.
 */
function beforeFirstStart(state: WorkspaceState): boolean {
  return (
    isNew(state) &&
    conversations[state.conversation].every(
      (item) => item.kind === 'user' && item.queued === true,
    )
  )
}

/**
 * The bar under the chat while the sandbox is not running. A refused start
 * shows the words of its cause: the org or the owner. A failed start
 * carries the message that the app saved for it. A failed first start
 * keeps the composer under its bar. A workspace from Conductor draws its
 * own question before its activation, and its own failed activation.
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
      if (isImported(state)) return undefined
      return {
        problem: 'error',
        message: startErrors[state.startError],
        firstStart: beforeFirstStart(state),
      }
    case 'stopped':
    case 'archived':
      return { problem: state.sandbox }
    case 'ready':
    case 'starting':
    case 'inactive':
    case 'archived-inactive':
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
