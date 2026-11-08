import { withSession } from './chat-snapshot'
import { logOf, withTranscript, type ChatContext } from './context'
import { chatEventsOf } from './session-log'

/** A page of the history that leaves the read where it was. */
class NoProgress extends Error {}

/**
 * Reads the pages of the stored history of a session in order. Each page
 * goes to the session's log at once, so the load never holds the whole
 * history as one reply. Gives the cutoff that all pages share.
 */
async function readPages(
  context: ChatContext,
  sessionId: string,
): Promise<number | null> {
  const log = logOf(context, sessionId)
  let after = 0
  let page = await context.api.history(sessionId)
  const through = page.throughEventNumber
  for (;;) {
    if (!context.live()) return null
    const own = page.envelopes.filter(
      (envelope) => envelope.workspaceId === context.target.workspaceId,
    )
    log.merge(chatEventsOf(sessionId, own))
    const next = page.nextAfterEventNumber
    if (next === null) return through
    if (next <= after) throw new NoProgress()
    after = next
    page = await context.api.history(sessionId, after, through)
  }
}

async function loadHistory(
  context: ChatContext,
  sessionId: string,
): Promise<number | null> {
  if (!context.live()) return null
  const mark = (hydration: 'loading' | 'ready' | 'failed') =>
    context.store.update((snapshot) =>
      withSession(snapshot, sessionId, (current) => ({
        ...current,
        hydration,
      })),
    )
  mark('loading')
  try {
    const through = await readPages(context, sessionId)
    if (through === null || !context.live()) return null
    const log = logOf(context, sessionId)
    context.store.update((snapshot) =>
      withTranscript(snapshot, sessionId, log.transcript, log.times),
    )
    mark('ready')
    return through
  } catch {
    if (!context.live()) return null
    const log = logOf(context, sessionId)
    context.store.update((snapshot) =>
      withTranscript(snapshot, sessionId, log.transcript, log.times),
    )
    mark('failed')
    return null
  }
}

/**
 * Loads the full stored history of a session, page by page, and gives the
 * event number that it reaches, or null when it loads nothing. One load
 * runs at a time for each session, so a second call gets the running load.
 * A loaded session loads again only `again`. The events can be older than
 * the stream's cursor, so they go to the session's own log, never through
 * the stream's check.
 */
export function hydrate(
  context: ChatContext,
  sessionId: string,
  again = false,
): Promise<number | null> {
  const running = context.loading.get(sessionId)
  if (running) return running
  const state = context.store.get().sessionStates[sessionId]
  if (state?.hydration === 'ready' && !again) return Promise.resolve(null)
  const load = loadHistory(context, sessionId).finally(() => {
    if (context.loading.get(sessionId) === load) {
      context.loading.delete(sessionId)
    }
  })
  context.loading.set(sessionId, load)
  return load
}

/**
 * Loads the history of each session that becomes the shown session,
 * whatever changed the selection: an action, a record from the stream, or
 * the first load. It acts only on a change of the shown session, so a
 * failed load waits for the user, or for the next change, and never loops.
 * The returned function stops the watch.
 */
export function watchShownSession(context: ChatContext): () => void {
  let shown: string | null = null
  return context.store.subscribe(() => {
    const sessionId = context.store.get().activeSessionId
    if (sessionId === shown) return
    shown = sessionId
    if (sessionId && context.live()) void hydrate(context, sessionId)
  })
}
