import type {
  TemporaryTab,
  WorkspacePane,
  WorkspaceTab,
  WorkspaceView,
} from './workspace-view'

/** One file keeps its identity in Preview and Source, including its temporary mark. */
export function tabKey(tab: WorkspaceTab | TemporaryTab): string {
  return tab.kind === 'session'
    ? `session:${tab.sessionId}`
    : `${tab.kind}:${tab.path}`
}

export function emptyPane(): WorkspacePane {
  return { tabs: [], activeTab: null, temporaryTab: null }
}

/** All open tabs, with the left pane first. */
export function allTabs(view: WorkspaceView | null): readonly WorkspaceTab[] {
  return view?.panes.flatMap((pane) => pane.tabs) ?? []
}

export function focusedPane(view: WorkspaceView): WorkspacePane {
  return view.panes[view.focusedPane] ?? view.panes[0]
}

/** Removes empty panes and keeps focus on the same surviving pane. */
export function withPanes(
  view: WorkspaceView,
  panes: readonly WorkspacePane[],
  focus = view.focusedPane,
): WorkspaceView {
  const open = panes.filter((pane) => pane.tabs.length > 0)
  const first = open[0] ?? panes[0] ?? emptyPane()
  const second = open[1]
  const focused = panes[focus]
  return {
    ...view,
    panes: second ? [first, second] : [first],
    focusedPane: second && focused === second ? 1 : 0,
  }
}

export function updatePane(
  view: WorkspaceView,
  index: number,
  change: (pane: WorkspacePane) => WorkspacePane,
): WorkspaceView {
  const current = view.panes[index]
  if (!current) return view
  const pane = change(current)
  if (pane === current) return view
  return withPanes(
    view,
    view.panes.map((item, at) => (at === index ? pane : item)),
  )
}

/** Keeps selection and the temporary mark unless their tab left this pane. */
export function paneWithTabs(
  pane: WorkspacePane,
  tabs: readonly WorkspaceTab[],
): WorkspacePane {
  const keys = new Set(tabs.map(tabKey))
  const active = pane.activeTab
  const at = active
    ? pane.tabs.findIndex((tab) => tabKey(tab) === tabKey(active))
    : -1
  const next =
    active && !keys.has(tabKey(active))
      ? (pane.tabs.slice(at + 1).find((tab) => keys.has(tabKey(tab))) ??
        pane.tabs
          .slice(0, Math.max(at, 0))
          .findLast((tab) => keys.has(tabKey(tab))) ??
        tabs[0] ??
        null)
      : active
  return {
    tabs,
    activeTab: next,
    temporaryTab:
      pane.temporaryTab && keys.has(tabKey(pane.temporaryTab))
        ? pane.temporaryTab
        : null,
  }
}
