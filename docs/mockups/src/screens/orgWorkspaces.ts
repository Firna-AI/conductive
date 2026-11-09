import { orgRows } from '../components/chat/chatWorkspaces'
import {
  suspendedSections,
  workspaceSections,
  type OpenWorkspace,
  type WorkspaceRow,
} from '../components/workspaces/sections'
import type { ConversationKey } from '../fixtures/conversations'
import { savedCarts } from '../fixtures/workspaces'
import { isNew } from './workspaceTabs'
import type { WorkspaceState } from './workspaceState'

/**
 * The chats of the workspace links page. They happen after the create flow
 * made Saved carts, while its agent still works on the first message.
 */
const linkChats: ReadonlySet<ConversationKey> = new Set([
  'link-sent',
  'link-answer',
  'other-org-link',
])

/**
 * The workspaces that the create flow made by the time of the state. In
 * the chats of the workspace links page, and with a message that links
 * Saved carts, the list shows Saved carts at the top of General, and a
 * chip finds it there.
 */
export function createdWorkspaces(
  state: WorkspaceState,
): readonly OpenWorkspace[] {
  const later =
    state.composer === 'workspace-link' ||
    state.composer === 'workspace-link-pointer' ||
    linkChats.has(state.conversation)
  return later && !isNew(state)
    ? [{ workspace: savedCarts, status: 'working' }]
    : []
}

/**
 * The workspaces that the chat of an open workspace finds for its chips:
 * the rows of the list of the screen, with the same states, and the
 * archived workspaces of the org.
 */
export function chatWorkspacesOf(
  state: WorkspaceState,
  open: OpenWorkspace,
): readonly WorkspaceRow[] {
  return orgRows(
    state.org === 'suspended'
      ? suspendedSections(open.workspace)
      : workspaceSections(open, undefined, createdWorkspaces(state)),
  )
}
