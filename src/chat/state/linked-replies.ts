import type { SendMessageResponse } from '../../shared/messages'
import { withSession } from './chat-snapshot'
import type { ChatContext } from './context'
import { selectSession } from './session-actions'
import { placeIfNewest } from './session-records'

/**
 * Puts the message of a Send or Try again reply in the session that the reply
 * names, unless that session already shows or holds it. A reply can name
 * another session than its request: a linked session that the Worker opened,
 * because the login of the starter was not available. Its record from the
 * reply shows only while no other record of it came, so a record from the
 * stream or an action always wins. Gives the session that took the message.
 */
export function takeReply(
  context: ChatContext,
  from: string,
  reply: SendMessageResponse,
): string | null {
  if (!context.live()) return null
  const { message, session } = reply
  const target = message.sessionId
  if (target !== from && session.id === target) {
    placeIfNewest(context, session, 0)
  }
  context.store.update((snapshot) =>
    withSession(snapshot, target, (state) => {
      const known =
        state.pending.some((item) => item.id === message.id) ||
        state.transcript.items.some((item) => item.id === `user:${message.id}`)
      return known ? state : { ...state, pending: [...state.pending, message] }
    }),
  )
  return target
}

/**
 * Shows the session that took a message, when it is not the session of the
 * request. Only the tab that sent moves, and only while it still shows the
 * session of the request, so a user who opened another tab keeps that tab.
 * The selection saves the view, and the new session loads its own history.
 */
export async function showTarget(
  context: ChatContext,
  from: string,
  target: string | null,
): Promise<void> {
  if (!context.live() || target === null || target === from) return
  const snapshot = context.store.get()
  const open = snapshot.sessions.some((item) => item.id === target)
  if (open && snapshot.activeSessionId === from) {
    await selectSession(context, target)
  }
}
