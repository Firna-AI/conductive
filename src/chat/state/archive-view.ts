import type { Session } from '../../shared/generated/Session'
import type { WorkspaceView } from '../../shared/workspace-view'

import { allTabs } from '../../shared/workspace-panes'
import type { ChatSnapshot } from './chat-snapshot'
import type { ChatContext } from './context'
import { hydrate } from './history'
import { withSessionPlaces } from './session-tab-places'
import { viewShowing, viewWithout } from './sessions'
import { sessionTarget } from './pane-selection'

/**
 * A read-only workspace keeps its chat as it is, and the backend refuses
 * its writes: an archived workspace, and a workspace of a suspended org. So
 * its session tabs change in the browser only: the reader opens the stored
 * history of any session as a tab, and closes that tab again. The stored
 * session records never change, so a closed session stays closed.
 * The browser copy of the view holds these tabs, and the records stay in
 * `sessions` and `history`.
 */
export function isArchived(snapshot: ChatSnapshot): boolean {
  return snapshot.workspace?.state === 'archived'
}

/** The sessions whose tabs show, in the order of the tabs. */
export function tabSessions(
  snapshot: ChatSnapshot,
  readOnly = isArchived(snapshot),
): readonly Session[] {
  if (!readOnly || snapshot.view === null) return snapshot.sessions
  const known = new Map(
    [...snapshot.sessions, ...snapshot.history].map((item) => [item.id, item]),
  )
  return allTabs(snapshot.view).flatMap((tab) =>
    tab.kind === 'session' ? (known.get(tab.sessionId) ?? []) : [],
  )
}

/** A failed view load keeps each open session when a local action starts a view. */
function localView(snapshot: ChatSnapshot): WorkspaceView {
  const sessionId = sessionTarget(snapshot)
  return (
    snapshot.view ?? {
      panes: [
        {
          tabs: snapshot.sessions.map(({ id }) => ({
            kind: 'session',
            sessionId: id,
          })),
          activeTab: sessionId ? { kind: 'session', sessionId } : null,
          temporaryTab: null,
        },
      ],
      focusedPane: 0,
      fileList: 'all',
      tool: 'terminal',
    }
  )
}

/**
 * The sessions that the session history lists: the closed sessions. In a
 * read-only workspace, it lists each session without a tab, so a tab that
 * the reader closed shows there again, also one of a session that was open
 * at the archive. `readOnly` is true for an archived workspace, and for a
 * workspace that the host shows read-only.
 */
export function historySessions(
  snapshot: ChatSnapshot,
  readOnly = isArchived(snapshot),
): readonly Session[] {
  if (!readOnly) return snapshot.history
  const shown = new Set(tabSessions(snapshot, true).map((item) => item.id))
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
 * Shows a session of a read-only workspace as a tab and as the shown
 * session, and loads its stored history. It writes nothing. Each call is a
 * choice of a shown session, which an older address lookup yields to.
 */
export async function showLocally(
  context: ChatContext,
  sessionId: string,
): Promise<void> {
  context.tabChoices.count += 1
  const snapshot = context.store.get()
  const known = [...snapshot.sessions, ...snapshot.history]
  if (!known.some((item) => item.id === sessionId)) return
  context.store.update((current) => ({
    ...current,
    view: viewShowing(localView(current), sessionId),
    overlay: { kind: 'none' },
  }))
  await hydrate(context, sessionId)
}

/**
 * Closes the tab of a session of a read-only workspace. The next tab shows.
 * It writes nothing, and the session stays in the session history.
 */
export function closeLocally(context: ChatContext, sessionId: string): void {
  context.store.update((snapshot) => {
    const shown = tabSessions(snapshot, true)
    if (!shown.some((item) => item.id === sessionId)) return snapshot
    return {
      ...snapshot,
      view: viewWithout(localView(snapshot), sessionId),
    }
  })
}

/**
 * The snapshot after its workspace left the archived state, such as after a
 * Restore. The tabs that changed in the browser only end, so the open
 * sessions show in their saved order again. An overlay that the archive hid,
 * such as a question before a close, ends too. A session that the reader
 * showed from the history gives way to an open one.
 */
export function afterRestore(snapshot: ChatSnapshot): ChatSnapshot {
  return {
    ...snapshot,
    overlay: { kind: 'none' },
    view: withSessionPlaces(snapshot.view, snapshot.sessions),
  }
}

/**
 * Reads the saved view again after a Restore, because the read-only visit
 * changed its tabs in the browser only. A change of the view after the
 * Restore wins over the read, and a read that fails keeps the view.
 */
export async function reloadView(context: ChatContext): Promise<void> {
  const before = context.store.get().view
  const reply = await context.api.view().catch(() => null)
  if (!context.live() || reply === null) return
  context.store.update((snapshot) =>
    snapshot.view === before && !isArchived(snapshot)
      ? { ...snapshot, view: withSessionPlaces(reply.view, snapshot.sessions) }
      : snapshot,
  )
}
