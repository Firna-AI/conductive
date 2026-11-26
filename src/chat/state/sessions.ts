import type { Session } from '../../shared/generated/Session'

import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import type { ChatSnapshot, Overlay } from './chat-snapshot'
import { withView } from './saved-view'
import { withSessionPlace } from './tab-order'

const isSessionTab = (
  tab: WorkspaceTab | null,
): tab is Extract<WorkspaceTab, { kind: 'session' }> => tab?.kind === 'session'

/** Open sessions in the order of their tabs, then the ones with no tab yet. */
export function orderSessions(
  open: readonly Session[],
  view: WorkspaceView | null,
): Session[] {
  const order = (view?.tabs ?? [])
    .filter(isSessionTab)
    .map((tab) => tab.sessionId)
  const rank = (session: Session) => {
    const index = order.indexOf(session.id)
    return index < 0 ? order.length : index
  }
  return [...open].sort(
    (left, right) =>
      rank(left) - rank(right) || left.createdAt - right.createdAt,
  )
}

/** The session that the view shows, or the first open session. */
export function pickActive(
  open: readonly Session[],
  view: WorkspaceView | null,
): string | null {
  const active = view?.activeTab ?? null
  if (
    isSessionTab(active) &&
    open.some((item) => item.id === active.sessionId)
  ) {
    return active.sessionId
  }
  return open[0]?.id ?? null
}

/** Whether the session is active, with a session tab or no selected tab. */
export function showsSession(
  snapshot: ChatSnapshot,
  sessionId: string,
): boolean {
  const activeTab = snapshot.view?.activeTab ?? null
  return (
    snapshot.activeSessionId === sessionId &&
    (activeTab === null || isSessionTab(activeTab))
  )
}

/** The view with the session's tab, made the active tab. */
export function viewShowing(
  view: WorkspaceView,
  sessionId: string,
): WorkspaceView {
  const tab: WorkspaceTab = { kind: 'session', sessionId }
  const present = view.tabs.some(
    (item) => isSessionTab(item) && item.sessionId === sessionId,
  )
  return {
    ...view,
    tabs: present ? view.tabs : [...view.tabs, tab],
    activeTab: tab,
  }
}

/** The view without the session's tab. The next session takes its place. */
function viewWithout(
  view: WorkspaceView,
  sessionId: string,
  next: string | null,
): WorkspaceView {
  const tabs = view.tabs.filter(
    (tab) => !(isSessionTab(tab) && tab.sessionId === sessionId),
  )
  const closedActive =
    isSessionTab(view.activeTab) && view.activeTab.sessionId === sessionId
  if (!closedActive) return { ...view, tabs }
  return {
    ...view,
    tabs,
    activeTab: next ? { kind: 'session', sessionId: next } : null,
  }
}

/** The session that takes the place of a closed tab: the next, else the one before. */
export function neighbour(
  open: readonly Session[],
  sessionId: string,
): string | null {
  const index = open.findIndex((item) => item.id === sessionId)
  const rest = open.filter((item) => item.id !== sessionId)
  if (rest.length === 0) return null
  return (rest[Math.min(Math.max(index, 0), rest.length - 1)] ?? rest[0]).id
}

const lastClosedFirst = (left: Session, right: Session) =>
  (right.closedAt ?? 0) - (left.closedAt ?? 0)

function withMembership(
  snapshot: ChatSnapshot,
  session: Session,
): ChatSnapshot {
  const others = (list: readonly Session[]) =>
    list.filter((item) => item.id !== session.id)
  const known = snapshot.sessions.findIndex((item) => item.id === session.id)
  if (session.closedAt === null) {
    const sessions =
      known < 0
        ? [...snapshot.sessions, session]
        : snapshot.sessions.map((item) =>
            item.id === session.id ? session : item,
          )
    return {
      ...snapshot,
      sessions,
      history: others(snapshot.history),
    }
  }
  return {
    ...snapshot,
    sessions: others(snapshot.sessions),
    history: [...others(snapshot.history), session].sort(lastClosedFirst),
  }
}

/**
 * Updates stored membership before placing the tab. Local read-only tabs
 * keep their order, selection, and view. Otherwise a closed session yields
 * to the next tab, and the history lists the last closed first.
 */
export function placeSession(
  snapshot: ChatSnapshot,
  session: Session,
): ChatSnapshot {
  const placed = withMembership(snapshot, session)
  if (snapshot.archiveTabs !== null) return placed
  if (session.closedAt === null) {
    const next = withView(placed, (view) => withSessionPlace(view, session.id))
    return {
      ...next,
      sessions: orderSessions(next.sessions, next.view),
      activeSessionId: snapshot.activeSessionId ?? session.id,
    }
  }
  const active =
    snapshot.activeSessionId === session.id
      ? neighbour(snapshot.sessions, session.id)
      : snapshot.activeSessionId
  return {
    ...withView(placed, (view) => viewWithout(view, session.id, active)),
    activeSessionId: active,
    overlay: overlayWithout(snapshot.overlay, session.id),
  }
}

/**
 * The overlay after a session closed, such as through another member. A
 * rename of that session ends. A question before a close no longer names
 * it, and a question that names no session then ends.
 */
function overlayWithout(overlay: Overlay, sessionId: string): Overlay {
  if (overlay.kind === 'rename') {
    return overlay.sessionId === sessionId ? { kind: 'none' } : overlay
  }
  if (overlay.kind !== 'close' || !overlay.sessionIds.includes(sessionId)) {
    return overlay
  }
  const sessionIds = overlay.sessionIds.filter((id) => id !== sessionId)
  return sessionIds.length > 0
    ? { kind: 'close', sessionIds }
    : { kind: 'none' }
}

/** Sorts a history list, the last closed first. */
export function sortHistory(history: readonly Session[]): Session[] {
  return [...history].sort(lastClosedFirst)
}
