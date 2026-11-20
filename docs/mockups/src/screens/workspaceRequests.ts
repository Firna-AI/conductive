import { isPendingRequest } from '../components/chat/requests'
import { conversations } from '../fixtures/conversations'
import { workspaceSessions } from '../fixtures/sessions'
import type { WorkspaceState } from './workspaceState'

/**
 * Whether the chat of the open session holds an open request: a request
 * whose tool call waits, or a late request that waits for a member. The
 * request waits above the composer of that chat.
 */
export function chatWaits(state: WorkspaceState): boolean {
  return conversations[state.conversation].some(isPendingRequest)
}

/**
 * Whether the workspace needs input: a session of the workspace holds an
 * open request, the open one or another (decision 68).
 */
export function needsInput(state: WorkspaceState): boolean {
  return chatWaits(state) || state.otherRequest !== 'none'
}

/**
 * Whether a session tab shows the needs-input mark (needs-input decision
 * 2 B): its session holds an open request. `chat` says whether the open
 * chat is the chat of that session. The shown tab carries the mark too,
 * and the mark wins over the spinner of a running turn.
 */
export function tabNeedsInput(
  state: WorkspaceState,
  key: string,
  chat: boolean,
): boolean {
  if (chat) return chatWaits(state)
  return (
    state.otherRequest === 'first-session' && key === workspaceSessions[0].key
  )
}
