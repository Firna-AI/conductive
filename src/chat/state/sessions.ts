import type { Session } from '../../shared/generated/Session'

import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import {
  allTabs,
  emptyPane,
  focusedPane,
  updatePane,
  withPanes,
  paneWithTabs,
} from '../../shared/workspace-panes'
import type { ChatSnapshot, Overlay } from './chat-snapshot'
import { withSessionPlace } from './session-tab-places'

const isSessionTab = (
  tab: WorkspaceTab | null,
): tab is Extract<WorkspaceTab, { kind: 'session' }> => tab?.kind === 'session'

/** Open sessions in the order of their tabs, then the ones with no tab yet. */
export function orderSessions(
  open: readonly Session[],
  view: WorkspaceView | null,
): Session[] {
  const order = allTabs(view)
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
  const active = view ? focusedPane(view).activeTab : null
  if (
    isSessionTab(active) &&
    open.some((item) => item.id === active.sessionId)
  ) {
    return active.sessionId
  }
  return open[0]?.id ?? null
}

/** The view with the session's tab, made the active tab. */
export function viewShowing(
  view: WorkspaceView | null,
  sessionId: string,
): WorkspaceView {
  const tab: WorkspaceTab = { kind: 'session', sessionId }
  const base: WorkspaceView = view ?? {
    panes: [emptyPane()],
    focusedPane: 0,
    fileList: 'all',
    tool: 'terminal',
  }
  const existing = base.panes.findIndex((pane) =>
    pane.tabs.some(
      (item) => isSessionTab(item) && item.sessionId === sessionId,
    ),
  )
  const index = existing < 0 ? base.focusedPane : existing
  const changed = updatePane(base, index, (pane) => ({
    ...pane,
    tabs: existing < 0 ? [...pane.tabs, tab] : pane.tabs,
    activeTab: tab,
  }))
  return { ...changed, focusedPane: index === 1 ? 1 : 0 }
}

/** The view without the session's tab. The next session takes its place. */
export function viewWithout(
  view: WorkspaceView,
  sessionId: string,
  next: string | null,
): WorkspaceView {
  return withPanes(
    view,
    view.panes.map((pane) => {
      const tabs = pane.tabs.filter(
        (tab) => !(isSessionTab(tab) && tab.sessionId === sessionId),
      )
      if (tabs.length === pane.tabs.length) return pane
      const repaired = paneWithTabs(pane, tabs)
      const closedActive =
        isSessionTab(pane.activeTab) && pane.activeTab.sessionId === sessionId
      if (!closedActive) return repaired
      const useNext =
        next && tabs.some((tab) => isSessionTab(tab) && tab.sessionId === next)
      return {
        ...repaired,
        activeTab: useNext
          ? { kind: 'session', sessionId: next }
          : view.panes.length === 1
            ? null
            : repaired.activeTab,
      }
    }),
  )
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

/**
 * Puts a session record where it belongs: an open session among the tabs, a
 * closed one in the history, the last closed first. When the open session
 * closes, the next session becomes the open one. A read-only workspace
 * updates the records without changing browser tabs or selection.
 */
export function placeSession(
  snapshot: ChatSnapshot,
  session: Session,
  readOnly = false,
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
    const view = readOnly
      ? snapshot.view
      : withSessionPlace(snapshot.view, session.id)
    return {
      ...snapshot,
      view,
      sessions: orderSessions(sessions, view),
      history: others(snapshot.history),
      activeSessionId: readOnly
        ? snapshot.activeSessionId
        : (snapshot.activeSessionId ?? session.id),
    }
  }
  const active =
    !readOnly && snapshot.activeSessionId === session.id
      ? neighbour(snapshot.sessions, session.id)
      : snapshot.activeSessionId
  return {
    ...snapshot,
    sessions: others(snapshot.sessions),
    history: [...others(snapshot.history), session].sort(lastClosedFirst),
    activeSessionId: active,
    view:
      !readOnly && snapshot.view
        ? viewWithout(snapshot.view, session.id, active)
        : snapshot.view,
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
