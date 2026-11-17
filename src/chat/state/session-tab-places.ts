import type { Session } from '../../shared/generated/Session'
import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import {
  allTabs,
  emptyPane,
  paneWithTabs,
  updatePane,
  withPanes,
} from '../../shared/workspace-panes'

/** Appends an arriving session in the focused pane without changing another place. */
export function withSessionPlace(
  view: WorkspaceView | null,
  sessionId: string,
): WorkspaceView | null {
  if (
    !view ||
    allTabs(view).some(
      (tab) => tab.kind === 'session' && tab.sessionId === sessionId,
    )
  )
    return view
  return updatePane(view, view.focusedPane, (pane) => ({
    ...pane,
    tabs: [...pane.tabs, { kind: 'session', sessionId }],
  }))
}

/** Restores a session's row and position after a failed close, including an emptied pane. */
export function withSessionTabAt(
  view: WorkspaceView,
  sessionId: string,
  index: number,
  paneIndex = view.focusedPane,
  previousPaneCount = view.panes.length,
): WorkspaceView {
  if (
    allTabs(view).some(
      (tab) => tab.kind === 'session' && tab.sessionId === sessionId,
    )
  )
    return view
  const tab: WorkspaceTab = { kind: 'session', sessionId }
  if (previousPaneCount === 2 && view.panes.length === 1) {
    const restored = { ...emptyPane(), tabs: [tab] }
    return {
      ...view,
      panes:
        paneIndex === 0 ? [restored, view.panes[0]] : [view.panes[0], restored],
      focusedPane: paneIndex === 0 ? 1 : 0,
    }
  }
  return updatePane(view, paneIndex, (pane) => {
    const tabs = [...pane.tabs]
    tabs.splice(Math.min(index, tabs.length), 0, tab)
    return { ...pane, tabs }
  })
}

/** Reconciles session places once at load, then appends missing sessions in creation order. */
export function withSessionPlaces(
  view: WorkspaceView | null,
  open: readonly Session[],
): WorkspaceView | null {
  if (!view) return null
  const ids = new Set(open.map((session) => session.id))
  const placed = new Set<string>()
  let changed = false
  const panes = view.panes.map((pane) => {
    const tabs = pane.tabs.filter((tab) => {
      if (tab.kind !== 'session') return true
      if (!ids.has(tab.sessionId) || placed.has(tab.sessionId)) return false
      placed.add(tab.sessionId)
      return true
    })
    if (tabs.length === pane.tabs.length) return pane
    changed = true
    return paneWithTabs(pane, tabs)
  })
  let next = changed ? withPanes(view, panes) : view
  for (const session of [...open].sort((a, b) => a.createdAt - b.createdAt)) {
    next = withSessionPlace(next, session.id) ?? next
  }
  return next
}
