import type { SendMessageResponse } from '../../shared/messages'
import { sessionState, withSession, type Draft } from './chat-snapshot'
import type { ChatContext } from './context'
import { hydrate } from './history'
import { applyMoves, saveMovedView, type DraftMove } from './model-moves'
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

/** Work in a draft that the user loses when another draft takes its place. */
function holdsWork(draft: Draft): boolean {
  return (
    draft.text !== '' ||
    draft.attachments.length > 0 ||
    draft.uploads > 0 ||
    draft.sending
  )
}

/**
 * Shows the session that took a message, when it is not the session of the
 * request. Only the tab that sent moves, and only while it still shows the
 * session of the request, so a user who opened another tab keeps that tab.
 *
 * The draft of the request moves with the view in the same snapshot, with
 * its identity, its text, its files, and its uploads, so the user types on
 * in the same box, and the next message goes to the session that holds the
 * accepted one. The source gets a new empty draft. The draft stays when the
 * source holds another draft now, when another send of the draft waits, or
 * when the new session holds unfinished work. Then a source with unfinished
 * work stays shown. The new session loads its own history.
 */
export async function showTarget(
  context: ChatContext,
  from: string,
  target: string | null,
  draftId: string,
): Promise<void> {
  if (!context.live() || target === null || target === from) return
  const snapshot = context.store.get()
  const open = snapshot.sessions.some((item) => item.id === target)
  if (!open || snapshot.activeSessionId !== from) return
  const source = sessionState(snapshot, from).draft
  const movable =
    source.id === draftId &&
    !source.sending &&
    !holdsWork(sessionState(snapshot, target).draft)
  if (!movable) {
    if (!holdsWork(source)) await selectSession(context, target)
    return
  }
  const moves: DraftMove[] = [
    { from, to: target, open: true, freshId: context.newDraftId() },
  ]
  context.store.update((current) => applyMoves(current, moves))
  saveMovedView(context, moves)
  await hydrate(context, target)
}
