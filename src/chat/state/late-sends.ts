import { withSession, type ChatSnapshot } from './chat-snapshot'

/**
 * The client IDs of the member messages that the transcripts of the chat
 * show, in every session.
 */
export function shownMessageIds(snapshot: ChatSnapshot): Set<string> {
  return new Set(
    Object.values(snapshot.sessionStates).flatMap((state) =>
      state.transcript.items.flatMap((item) =>
        item.kind === 'user' ? [item.message.id] : [],
      ),
    ),
  )
}

/**
 * The session whose transcript shows the member message with this client
 * ID, if any, such as the written prompt of an explanation that the app
 * named.
 */
export function sessionShowing(
  snapshot: ChatSnapshot,
  messageId: string,
): string | null {
  for (const [sessionId, state] of Object.entries(snapshot.sessionStates)) {
    const shown = state.transcript.items.some(
      (item) => item.kind === 'user' && item.message.id === messageId,
    )
    if (shown) return sessionId
  }
  return null
}

/**
 * The snapshot after a transcript shows messages whose send failed. A send
 * with no answer, or with a server error, can still reach the Worker, as
 * `isRefusal` says. When a transcript then shows the message by its client
 * ID, the message did send. So the notice of its failed send goes. A draft
 * that holds the message back unchanged since the failure empties, because
 * its message is now in the chat. A draft that the user changed after the
 * failure has no client ID, as `failSend` says, so it stays.
 */
export function withLateSends(
  snapshot: ChatSnapshot,
  shown: ReadonlySet<string>,
): ChatSnapshot {
  const failed = snapshot.notice?.messageId
  let next =
    failed !== undefined && shown.has(failed)
      ? { ...snapshot, notice: null }
      : snapshot
  for (const [sessionId, { draft }] of Object.entries(next.sessionStates)) {
    if (draft.sending || draft.sendId === null) continue
    if (!shown.has(draft.sendId)) continue
    next = withSession(next, sessionId, (state) => ({
      ...state,
      draft: {
        ...state.draft,
        text: '',
        files: [],
        detached: [],
        sendId: null,
      },
    }))
  }
  return next
}
