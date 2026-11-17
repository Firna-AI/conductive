import type {
  WorkspacePane,
  WorkspaceView,
} from '../../src/shared/workspace-view'
import {
  allTabs,
  focusedPane,
  paneWithTabs,
  tabKey,
  withPanes,
} from '../../src/shared/workspace-panes'

/** Old apps can read one row, while current apps use the panes. */
export function workspaceViewReply(
  view: WorkspaceView,
): WorkspaceView & WorkspacePane {
  return {
    ...view,
    tabs: allTabs(view),
    activeTab: focusedPane(view).activeTab,
    temporaryTab: focusedPane(view).temporaryTab,
  }
}

/** Old saves replace one pane, or reorder each stored row without moving tabs across panes. */
export function fitLegacyWorkspaceView(
  incoming: WorkspaceView,
  stored: WorkspaceView,
): WorkspaceView {
  if (stored.panes.length === 1) return incoming
  const requested = allTabs(incoming)
  const previous = new Set(allTabs(stored).map(tabKey))
  const added = requested.filter((tab) => !previous.has(tabKey(tab)))
  const panes = stored.panes.map((pane, index) => {
    const owned = new Map(pane.tabs.map((tab) => [tabKey(tab), tab]))
    const tabs = requested.flatMap((tab) => {
      const existing = owned.get(tabKey(tab))
      return existing ? [existing] : []
    })
    if (index === stored.focusedPane) tabs.push(...added)
    return paneWithTabs(pane, tabs)
  })
  return withPanes(
    { ...incoming, focusedPane: stored.focusedPane },
    panes,
    stored.focusedPane,
  )
}
