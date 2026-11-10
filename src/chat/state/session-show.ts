import type { ChatSnapshot, ChatStore } from './chat-snapshot'

/** What the show of a session does now: select it, end, or wait. */
function stepOf(
  snapshot: ChatSnapshot,
  sessionId: string,
): 'select' | 'end' | 'wait' {
  if (snapshot.activeSessionId === sessionId) return 'end'
  // A page that shows in place of the chat, such as a document, keeps it.
  const active = snapshot.view?.activeTab ?? null
  if (active !== null && active.kind !== 'session') return 'end'
  if (snapshot.history.some((item) => item.id === sessionId)) return 'end'
  const open = snapshot.sessions.some((item) => item.id === sessionId)
  return open ? 'select' : 'wait'
}

/**
 * Shows a session that the server opened for this person, such as the
 * early session of an activation, once the chat has it open. It makes no
 * session record: it waits for the record that the server sends. It ends
 * without a select when `unchanged` turns false, as after a choice of the
 * person in the tabs, when a page shows in place of the chat, or when the
 * session closed. The result ends the wait.
 */
export function showWhenOpen(
  store: ChatStore,
  sessionId: string,
  unchanged: () => boolean,
  select: (sessionId: string) => void,
): () => void {
  let ended = false
  let stop: (() => void) | null = null
  const end = () => {
    ended = true
    stop?.()
  }
  const step = () => {
    if (ended) return
    const next = unchanged() ? stepOf(store.get(), sessionId) : 'end'
    if (next === 'wait') return
    end()
    if (next === 'select') select(sessionId)
  }
  stop = store.subscribe(step)
  step()
  return end
}
