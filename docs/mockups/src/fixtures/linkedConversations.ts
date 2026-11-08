import type { ChatItem } from './conversations'
import { linkedSession } from './sessions'

/**
 * The transcript of the linked session. It starts empty: the line that
 * links to the first session, then the message of the member who opened
 * it. The turn of that message runs, so the chat shows its thinking state.
 * `ask` is the message, the draft of the member.
 */
export function linkedConversations(ask: string) {
  return {
    linked: [
      { kind: 'linked', id: 'linked', from: linkedSession.from.title },
      { kind: 'user', id: 'ask', text: ask },
      { kind: 'working', id: 'working', elapsed: '3s' },
    ],
  } as const satisfies Record<string, readonly ChatItem[]>
}
