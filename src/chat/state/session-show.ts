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
function showWhenOpen(
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

/**
 * The show of a session that the server opened for this person, and the
 * choices of the person in the tabs, which end it. The controller counts
 * each choice with `choose`.
 */
export class SessionShow {
  /** The choices of the person in the tabs, which end a show of a session. */
  private choices = 0
  private endShow: (() => void) | null = null

  /** Counts a choice of the person in the tabs. */
  readonly choose = (): void => {
    this.choices += 1
  }

  /** The count of the choices of the person in the tabs, for `show`. */
  readonly count = (): number => this.choices

  /** Ends the show that waits, as a hide or a stop of the chat does. */
  readonly end = (): void => {
    this.endShow?.()
  }

  /**
   * Shows the session once the chat has it open, as `showWhenOpen` says. A
   * choice in the tabs since `since` ends it, and a newer show replaces it.
   */
  readonly show = (
    store: ChatStore,
    sessionId: string,
    since: number,
    select: (sessionId: string) => void,
  ): void => {
    this.endShow?.()
    this.endShow = showWhenOpen(
      store,
      sessionId,
      () => this.choices === since,
      select,
    )
  }
}
