import type { Session } from '../../shared/sessions'
import type { ChatSnapshot } from './chat-snapshot'
import type { ChatContext } from './context'
import { hydrate } from './history'
import { neighbour } from './sessions'

/**
 * An archived workspace keeps its chat read-only (decision 16), and the
 * backend refuses its writes. So its session tabs change in the browser
 * only: the reader opens the stored history of any session as a tab, and
 * closes that tab again. The stored session records never change, so a
 * closed session stays closed. `archiveTabs` holds the IDs of these tabs,
 * and the records stay in `sessions` and `history`.
 */
export function isArchived(snapshot: ChatSnapshot): boolean {
  return snapshot.workspace?.state === 'archived'
}

/** The IDs of the session tabs: the open sessions, until a local change. */
function tabIds(snapshot: ChatSnapshot): readonly string[] {
  return snapshot.archiveTabs ?? snapshot.sessions.map((item) => item.id)
}

/** The sessions whose tabs show, in the order of the tabs. */
export function tabSessions(snapshot: ChatSnapshot): readonly Session[] {
  if (snapshot.archiveTabs === null) return snapshot.sessions
  const known = [...snapshot.sessions, ...snapshot.history]
  return snapshot.archiveTabs.flatMap(
    (id) => known.find((item) => item.id === id) ?? [],
  )
}

/**
 * The sessions that the session history lists: the closed sessions. In an
 * archived workspace, it lists each session without a tab, so a tab that
 * the reader closed shows there again, also one of a session that was open
 * at the archive.
 */
export function historySessions(snapshot: ChatSnapshot): readonly Session[] {
  if (!isArchived(snapshot)) return snapshot.history
  const shown = new Set(tabIds(snapshot))
  return [...snapshot.sessions, ...snapshot.history].filter(
    (item) => !shown.has(item.id),
  )
}

/**
 * When a session ended: its close, or the archive for a session that was
 * open at the archive. Null while it is open.
 */
export function endedAt(
  snapshot: ChatSnapshot,
  session: Session,
): number | null {
  if (session.closedAt !== null || !isArchived(snapshot)) {
    return session.closedAt
  }
  return snapshot.workspace?.archivedAt ?? null
}

/**
 * Shows a session of an archived workspace as a tab and as the shown
 * session, and loads its stored history. It writes nothing.
 */
export async function showArchived(
  context: ChatContext,
  sessionId: string,
): Promise<void> {
  const snapshot = context.store.get()
  const known = [...snapshot.sessions, ...snapshot.history]
  if (!known.some((item) => item.id === sessionId)) return
  const ids = tabIds(snapshot)
  context.store.update((current) => ({
    ...current,
    archiveTabs: ids.includes(sessionId) ? ids : [...ids, sessionId],
    activeSessionId: sessionId,
    overlay: { kind: 'none' },
  }))
  await hydrate(context, sessionId)
}

/**
 * Closes the tab of a session of an archived workspace. The next tab shows.
 * It writes nothing, and the session stays in the session history.
 */
export function closeArchived(context: ChatContext, sessionId: string): void {
  context.store.update((snapshot) => {
    const shown = tabSessions(snapshot)
    if (!shown.some((item) => item.id === sessionId)) return snapshot
    const active =
      snapshot.activeSessionId === sessionId
        ? neighbour(shown, sessionId)
        : snapshot.activeSessionId
    return {
      ...snapshot,
      archiveTabs: shown
        .filter((item) => item.id !== sessionId)
        .map((item) => item.id),
      activeSessionId: active,
    }
  })
}
