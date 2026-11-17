import { paneWithTabs, withPanes } from '../../shared/workspace-panes'
import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'

/** A send's session stays in its source row without taking focus from another pane. */
export function placeSentSession(
  view: WorkspaceView | null,
  from: string,
  to: string,
  show: boolean,
): WorkspaceView | null {
  if (!view || from === to) return view
  const isSession = (tab: WorkspaceTab | null, id: string) =>
    tab?.kind === 'session' && tab.sessionId === id
  const source = view.panes.findIndex((pane) =>
    pane.tabs.some((tab) => isSession(tab, from)),
  )
  if (source < 0) return view
  const tab: WorkspaceTab = { kind: 'session', sessionId: to }
  return withPanes(
    view,
    view.panes.map((pane, index) => {
      if (index !== source) {
        const tabs = pane.tabs.filter((item) => !isSession(item, to))
        return tabs.length === pane.tabs.length
          ? pane
          : paneWithTabs(pane, tabs)
      }
      return {
        ...pane,
        tabs: pane.tabs.some((item) => isSession(item, to))
          ? pane.tabs
          : [...pane.tabs, tab],
        activeTab:
          show && isSession(pane.activeTab, from) ? tab : pane.activeTab,
      }
    }),
  )
}
