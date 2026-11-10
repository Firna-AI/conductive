import { nameLabel } from '../../../../src/shared/name-label'
import type { ChatItem } from './conversations'
import { linkedSession } from './sessions'

/**
 * The transcript of the linked session. It starts empty: the line that
 * links to the first session, then the message of the member who opened
 * it, which is also its first message. The turn of that message runs, so
 * the chat shows its thinking state.
 */
export const linkedConversations = {
  linked: [
    { kind: 'linked', id: 'linked', from: nameLabel(linkedSession.from.title) },
    { kind: 'user', id: 'ask', text: linkedSession.firstMessage },
    { kind: 'working', id: 'working', elapsed: '3s' },
  ],
} as const satisfies Record<string, readonly ChatItem[]>
