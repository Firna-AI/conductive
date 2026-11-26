import type { SendMessageResponse } from '../../shared/messages'
import { sessionState, withSession, type Draft } from './chat-snapshot'
import type { ChatContext } from './context'
import { moveDraft } from './drafts'
import { hydrate } from './history'
import { applyMoves, saveMovedView, type DraftMove } from './model-moves'
import { selectSession } from './session-actions'
import { confirmRecord } from './session-records'
import { showsSession } from './sessions'

/**
 * Puts the message of a Send or Try again reply in the session that the reply
 * names, unless its transcript already shows it. The message takes the place
 * of the same message while its send waits there. A reply can name
 * another session than its request: a linked session that the Worker opened,
 * because the login of the starter was not available. Its record from the
 * reply shows only while no newer record of it came by event number, so a
 * newer record from the stream or an action always wins. Gives the session
 * that took the message.
 */
export function takeReply(
  context: ChatContext,
  reply: SendMessageResponse,
): string | null {
  if (!context.live()) return null
  const { message, session } = reply
  const target = message.sessionId
  if (session.id === target) confirmRecord(context, session, reply.eventNumber)
  context.store.update((snapshot) =>
    withSession(snapshot, target, (state) => {
      const shown = state.transcript.items.some(
        (item) => item.id === `user:${message.id}`,
      )
      if (shown) return state
      const waits = state.pending.some((item) => item.id === message.id)
      const pending = waits
        ? state.pending.map((item) => (item.id === message.id ? message : item))
        : [...state.pending, message]
      return { ...state, pending }
    }),
  )
  return target
}

/** Work in a draft that the user loses when another draft takes its place. */
function holdsWork(draft: Draft): boolean {
  return draft.text !== '' || draft.files.length > 0 || draft.sending
}

/**
 * A view other than the shown tab that shows a session and sends from it,
 * such as the popover of an explanation. It moves no tab.
 */
export interface SendingView {
  /** The view shows this session now. */
  shows: (sessionId: string) => boolean
  /** Shows this session in the view, in place of the one that it shows. */
  show: (sessionId: string) => void
}

/**
 * Shows the session that took a message, when it is not the session of the
 * request. Only the view that sent follows: the shown tab, or `view`, such
 * as the popover of an explanation. It follows only while it still shows
 * the session of the request, so a user who opened another tab or another
 * popover keeps it.
 *
 * The draft of the request moves with the view in the same snapshot, with
 * its identity, its text, its files, and its uploads, so the user types on
 * in the same box, and the next message goes to the session that holds the
 * accepted one. The source gets a new empty draft. The draft stays when the
 * source holds another draft now, when another send of the draft waits, or
 * when the new session holds unfinished work. Then a source with unfinished
 * work stays shown. The new session loads its own history. A send that
 * moves no draft, such as a fixed prompt, gives no `draftId`, and takes the
 * rule of a draft that cannot move.
 */
export async function showTarget(
  context: ChatContext,
  from: string,
  target: string | null,
  draftId: string | null,
  view?: SendingView,
): Promise<void> {
  if (!context.live() || target === null || target === from) return
  const snapshot = context.store.get()
  const open = snapshot.sessions.some((item) => item.id === target)
  const shown = view ? view.shows(from) : snapshot.activeSessionId === from
  if (!open || !shown) return
  const source = sessionState(snapshot, from).draft
  const movable =
    draftId !== null &&
    source.id === draftId &&
    !source.sending &&
    !holdsWork(sessionState(snapshot, target).draft)
  if (!movable && holdsWork(source)) return
  if (!view) {
    if (movable) await moveWithTab(context, from, target)
    else if (showsSession(snapshot, from)) await selectSession(context, target)
    return
  }
  if (movable) {
    const move = { from, to: target, freshId: context.newDraftId() }
    context.store.update((current) => moveDraft(current, move))
  }
  view.show(target)
  await hydrate(context, target)
}

/**
 * Moves the draft of the request to the target with the focus of the shown
 * tab, in one snapshot, and saves the view.
 */
async function moveWithTab(
  context: ChatContext,
  from: string,
  to: string,
): Promise<void> {
  const moves: DraftMove[] = [
    { from, to, open: true, freshId: context.newDraftId() },
  ]
  context.store.update((current) => applyMoves(current, moves))
  saveMovedView(context, moves)
  await hydrate(context, to)
}
