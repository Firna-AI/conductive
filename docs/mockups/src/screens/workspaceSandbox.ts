import { isPendingCommand } from '../components/chat/PendingCommand'
import type {
  BarNotice,
  PanelNotice,
} from '../components/workspace/SandboxNotice'
import type { ArchiveRestore } from '../components/workspace/sandboxNoticeState'
import { orgSuspendedReason } from '../components/orgs/suspension'
import {
  archivedNow,
  postcodeArchive,
  type ArchiveDays,
} from '../fixtures/archive'
import { conversations, type ConversationKey } from '../fixtures/conversations'
import { startErrors } from '../fixtures/starting'
import { ownerSuspendedRefusal } from '../fixtures/startRefusals'
import type { ActivityStatus, OpenableWorkspace } from '../fixtures/workspaces'
import { isRunning } from './composerFor'
import { isNew } from './workspaceTabs'
import type { WorkspaceState } from './workspaceState'

/**
 * The chats of a session whose turn ended while another session of the
 * workspace works: the second session after it sent a message to the first,
 * and the first session after the agent of the second stopped its turn.
 */
const otherSessionWorks: ReadonlySet<ConversationKey> = new Set([
  'session-links',
  'stopped-from',
])

/**
 * The state of the open workspace, for its header and its row: the state
 * of its sandbox, or, on a ready sandbox, whether its agent waits for the
 * user or works. The agent of any session of the workspace counts.
 */
export function activityOf(state: WorkspaceState): ActivityStatus {
  // A refused start leaves the sandbox stopped.
  if (state.sandbox === 'refused') return 'stopped'
  if (state.sandbox !== 'ready') return state.sandbox
  if (conversations[state.conversation].some(isPendingCommand)) return 'input'
  const works = isRunning(state) || otherSessionWorks.has(state.conversation)
  return works ? 'working' : 'ready'
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
 * What an archived workspace can get back: Restore until its last day, for
 * every member, except in a suspended org, which refuses it. After that
 * day, Restore ended, also while the delete of the cloud computer tries
 * again. A workspace that is not archived, or that has no kept cloud
 * computer, has none.
 */
export function archiveRestore(
  state: WorkspaceState,
): ArchiveRestore | undefined {
  if (state.sandbox !== 'archived') return undefined
  switch (state.archive) {
    case 'none':
    case 'removed':
      return undefined
    case 'removed-deleting':
      return 'ended'
    case 'kept':
      return state.org === 'suspended' ? 'refused' : 'available'
  }
}

/**
 * Whether the 14 days of an archived workspace ended, so that it left the
 * list. Only a link opens it then.
 */
export function isRemoved(archive: WorkspaceState['archive']): boolean {
  return archive === 'removed' || archive === 'removed-deleting'
}

/**
 * The days that the bar of each workspace gives when a screen opens it
 * archived: the Archive of now, or the earlier Archive of the removed
 * workspace that a chip opens.
 */
const archiveDays: Readonly<Record<OpenableWorkspace, ArchiveDays>> = {
  'checkout-autocomplete': archivedNow,
  'saved-carts': archivedNow,
  'postcode-lookup': postcodeArchive,
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
 * keeps the composer under its bar. An archived workspace says what it can
 * get back, and when it leaves the list or when it left it.
 */
export function sandboxNotice(state: WorkspaceState): BarNotice | undefined {
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
      return {
        problem: 'error',
        message: startErrors[state.startError],
        firstStart: beforeFirstStart(state),
      }
    case 'stopped':
      return { problem: 'stopped' }
    case 'archived':
      return {
        problem: 'archived',
        restore: archiveRestore(state),
        removed: isRemoved(state.archive),
        days: archiveDays[state.workspace],
      }
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
export function panelState(state: WorkspaceState): PanelNotice | undefined {
  if (state.sandbox === 'starting') return { problem: 'starting' }
  return sandboxNotice(state)
}
