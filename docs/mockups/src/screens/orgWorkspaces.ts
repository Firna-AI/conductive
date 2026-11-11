import {
  orgRows,
  type ChatRow,
  type ChatSession,
} from '../components/chat/chatWorkspaces'
import {
  suspendedSections,
  workspaceSections,
  type ChangedWorkspace,
  type OpenWorkspace,
} from '../components/workspaces/sections'
import type { ConversationKey } from '../fixtures/conversations'
import {
  linkableSessions,
  type LinkableSession,
} from '../fixtures/sessionLinks'
import { checkoutAutocomplete, savedCarts } from '../fixtures/workspaces'
import { paths } from '../paths'
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
 * The chats of Checkout address autocomplete after its second session sent
 * a message to its first session and to Saved carts. Both agents work on
 * those messages.
 */
const sessionLinkChats: ReadonlySet<ConversationKey> = new Set([
  'sent-by',
  'session-links',
])

/**
 * The screen that shows each open session that a session link names, at
 * the time of the chats of session links. A closed session has none,
 * because a press opens the page of its workspace.
 */
const sessionPages: Readonly<Record<string, string>> = {
  autocomplete: paths.sentBy,
  debounce: paths.sessionChips,
  'saved-carts': paths.sentByOther,
}

/**
 * The rows that differ from the list by the time of the state. In the
 * chats of the workspace links page, and with a message that links Saved
 * carts, the list shows Saved carts at the top of General, and a chip
 * finds it there. After the second session of Checkout address
 * autocomplete sent its messages, Saved carts opens on its message, and
 * from Saved carts the list shows Checkout address autocomplete at work.
 */
export function changedWorkspaces(
  state: WorkspaceState,
): readonly ChangedWorkspace[] {
  if (state.conversation === 'sent-by-other') {
    return [
      { workspace: checkoutAutocomplete, status: 'working', to: paths.sentBy },
    ]
  }
  if (isNew(state)) return []
  const later =
    state.composer === 'workspace-link' ||
    state.composer === 'workspace-link-pointer' ||
    linkChats.has(state.conversation)
  const sent =
    state.composer === 'session-link' ||
    sessionLinkChats.has(state.conversation)
  if (sent) {
    return [{ workspace: savedCarts, status: 'working', to: paths.sentByOther }]
  }
  return later ? [{ workspace: savedCarts, status: 'working' }] : []
}

function chatSession(session: LinkableSession): ChatSession {
  const { id, title, closed } = session
  return {
    id,
    title,
    closed,
    to: closed ? undefined : sessionPages[session.key],
  }
}

/**
 * The workspaces that the chat of an open workspace finds for its chips:
 * the rows of the list of the screen, with the same states, and the
 * archived workspaces of the org. Each row of a workspace whose sessions a
 * link names holds the sessions that the chat read for it.
 */
export function chatWorkspacesOf(
  state: WorkspaceState,
  open: OpenWorkspace,
): readonly ChatRow[] {
  const rows = orgRows(
    state.org === 'suspended'
      ? suspendedSections(open.workspace)
      : workspaceSections(open, undefined, changedWorkspaces(state)),
  )
  return rows.map((row): ChatRow => {
    const sessions = linkableSessions.filter(
      (session) => session.workspace.key === row.workspace.key,
    )
    return sessions.length === 0
      ? row
      : { ...row, sessions: sessions.map(chatSession) }
  })
}
