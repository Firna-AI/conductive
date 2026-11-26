import type { ArchivedComputerState } from '../../../../src/shared/generated/ArchivedComputerState'
import type {
  BarNotice,
  PanelNotice,
} from '../components/workspace/SandboxNotice'
import {
  replacesList,
  type ArchiveRestore,
} from '../../../../src/ui/components/workspace/sandboxNoticeState'
import { orgSuspendedReason } from '../../../../src/ui/components/orgs/suspension'
import {
  archivedNow,
  postcodeArchive,
  type ArchiveDays,
} from '../fixtures/archive'
import { conversations, type ConversationKey } from '../fixtures/conversations'
import { startErrors } from '../fixtures/starting'
import { ownerSuspendedRefusal } from '../fixtures/startRefusals'
import type { OpenableWorkspace } from '../fixtures/workspaces'
import type { ActivityStatus } from '../../../../src/ui/components/workspaces/activityStatus'
import { isRunning } from './composerFor'
import { explainActivity } from './explainModel'
import { needsInput } from './workspaceRequests'
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
 * user or works. The agent of any session of the workspace counts, also
 * the agent of an explanation.
 */
export function activityOf(state: WorkspaceState): ActivityStatus {
  // A refused start leaves the sandbox stopped.
  if (state.sandbox === 'refused') return 'stopped'
  if (state.sandbox !== 'ready') return state.sandbox
  // After Restart the workspace starts until the agents are back.
  if (state.overlay === 'restarting') return 'starting'
  if (state.overlay === 'restart-update-failed') return 'starting'
  if (needsInput(state)) return 'input'
  const explain = explainActivity(state)
  if (explain === 'input') return 'input'
  const works = isRunning(state) || otherSessionWorks.has(state.conversation)
  return works || explain === 'working' ? 'working' : 'ready'
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
 * again. A workspace that is not archived, or that names no cloud computer,
 * has none.
 */
export function archiveRestore(
  state: WorkspaceState,
): ArchiveRestore | undefined {
  if (state.sandbox !== 'archived') return undefined
  switch (state.archive) {
    case 'pending':
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
 * What the app knows of the cloud computer of an archived workspace. It can
 * still exist while the workspace names it, while an unresolved create
 * request can still hold one that the workspace does not name, and while
 * its delete after the 14 days tries again. The other states come after a
 * confirmed delete.
 */
function archivedComputer(
  archive: WorkspaceState['archive'],
): ArchivedComputerState {
  switch (archive) {
    case 'kept':
    case 'pending':
    case 'removed-deleting':
      return 'may-exist'
    case 'none':
    case 'removed':
      return 'deleted'
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
 * get back, what the app knows of its cloud computer, and when it leaves
 * the list or when it left it.
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
        computer: archivedComputer(state.archive),
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

/**
 * All files and Changes show their rows, and not the state of the sandbox
 * in their place. A stopped sandbox, one whose later start failed, and one
 * that starts with saved lists keep them. A refused start, also in a
 * suspended org, a failed first start, and the first start of a new
 * workspace take their place, and an archived workspace has no lists.
 */
export function listsShow(state: WorkspaceState): boolean {
  const panel = panelState(state)
  if (!panel) return true
  return panel.problem !== 'archived' && !replacesList(panel, !isNew(state))
}
