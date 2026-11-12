import { withSession } from './chat-snapshot'
import type { ChatContext, HistoryLoad } from './context'
import type { StreamEnvelope } from '../api/read-workspace'
import { chatEventsOf } from '../../shared/transcript/session-events'
import { mergeSession } from './session-records'

/** A history page whose cursor does not move the read backwards. */
class NoProgress extends Error {}

function merge(
  context: ChatContext,
  sessionId: string,
  envelopes: readonly StreamEnvelope[],
): void {
  const own = envelopes.filter(
    (envelope) => envelope.workspaceId === context.target.workspaceId,
  )
  const change = mergeSession(context, sessionId, chatEventsOf(sessionId, own))
  context.store.update(change.apply)
}

/**
 * Publishes the newest page and its cutoff at once. Earlier pages load in
 * sequence and merge once, after the oldest page or an earlier-page failure.
 */
async function readPages(
  context: ChatContext,
  sessionId: string,
  newest: (through: number | null) => void,
): Promise<number | null> {
  let page = await context.api.history(sessionId)
  if (!context.live()) return null
  const through = page.throughEventNumber
  merge(context, sessionId, page.envelopes)
  newest(through)
  let before = through + 1
  const earlier: StreamEnvelope[] = []
  try {
    for (;;) {
      if (!context.live()) return null
      const next = page.nextBeforeEventNumber
      if (next === null) return through
      if (next >= before) throw new NoProgress()
      before = next
      page = await context.api.history(sessionId, before, through)
      if (!context.live()) return null
      earlier.push(...page.envelopes)
    }
  } finally {
    if (context.live() && earlier.length > 0) merge(context, sessionId, earlier)
  }
}

async function loadHistory(
  context: ChatContext,
  sessionId: string,
  newest: (through: number | null) => void,
): Promise<number | null> {
  const mark = (hydration: 'loading' | 'ready' | 'failed') =>
    context.store.update((snapshot) =>
      withSession(snapshot, sessionId, (current) => ({
        ...current,
        hydration,
      })),
    )
  try {
    if (!context.live()) return null
    mark('loading')
    const through = await readPages(context, sessionId, newest)
    if (through === null || !context.live()) return null
    mark('ready')
    return through
  } catch {
    if (!context.live()) return null
    mark('failed')
    return null
  } finally {
    newest(null)
  }
}

function historyLoad(
  context: ChatContext,
  sessionId: string,
  again: boolean,
): HistoryLoad | null {
  const running = context.loading.get(sessionId)
  if (running) return running
  const state = context.store.get().sessionStates[sessionId]
  if (state?.hydration === 'ready' && !again) return null
  const signals: {
    newest?: (through: number | null) => void
    complete?: (through: number | null) => void
    failed?: (error: unknown) => void
  } = {}
  const load: HistoryLoad = {
    newest: new Promise((resolve) => {
      signals.newest = resolve
    }),
    complete: new Promise((resolve, reject) => {
      signals.complete = resolve
      signals.failed = reject
    }),
  }
  context.loading.set(sessionId, load)
  void loadHistory(context, sessionId, (through) => signals.newest?.(through))
    .finally(() => {
      if (context.loading.get(sessionId) === load)
        context.loading.delete(sessionId)
    })
    .then(
      (through) => signals.complete?.(through),
      (error: unknown) => signals.failed?.(error),
    )
  return load
}

/** Gives the newest page's cutoff while the complete history keeps loading. */
export function hydrateNewest(
  context: ChatContext,
  sessionId: string,
  again = false,
): Promise<number | null> {
  return historyLoad(context, sessionId, again)?.newest ?? Promise.resolve(null)
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
  return (
    historyLoad(context, sessionId, again)?.complete ?? Promise.resolve(null)
  )
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
