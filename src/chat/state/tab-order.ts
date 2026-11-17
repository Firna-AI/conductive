import type { Session } from '../../shared/generated/Session'
import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import {
  allTabs,
  paneWithTabs,
  tabKey,
  withPanes,
} from '../../shared/workspace-panes'

export type TabPlace = { before: WorkspaceTab } | { after: WorkspaceTab }
export type TabTarget =
  { pane: 0 | 1; place: TabPlace | 'end' } | { newPane: 'left' | 'right' }

/**
 * The tabs that the row of `pane` shows: the tabs of its open sessions, and
 * its file and diff tabs when `files` holds. The row of the focused pane,
 * which is the only row without a view, then takes each open session that
 * has no place in either pane.
 */
export function rowTabs(
  view: WorkspaceView | null,
  sessions: readonly Session[],
  files: boolean,
  pane: 0 | 1,
): WorkspaceTab[] {
  const open = new Set(sessions.map((session) => session.id))
  const placed = new Set(allTabs(view).map(tabKey))
  const seen = new Set<string>()
  const tabs: WorkspaceTab[] = []
  const append = (tab: WorkspaceTab) => {
    const key = tabKey(tab)
    if (seen.has(key)) return
    seen.add(key)
    tabs.push(tab)
  }
  for (const tab of view?.panes[pane]?.tabs ?? []) {
    if (tab.kind === 'session' ? open.has(tab.sessionId) : files) append(tab)
  }
  if (pane !== (view?.focusedPane ?? 0)) return tabs
  for (const { id } of sessions) {
    const tab: WorkspaceTab = { kind: 'session', sessionId: id }
    if (!placed.has(tabKey(tab))) append(tab)
  }
  return tabs
}

/** One transition for every row move, pane move, and split. */
export function moveTab(
  view: WorkspaceView,
  tab: WorkspaceTab,
  target: TabTarget,
): WorkspaceView {
  const key = tabKey(tab)
  const from = view.panes.findIndex((pane) =>
    pane.tabs.some((item) => tabKey(item) === key),
  )
  const source = view.panes[from]
  const moving = source?.tabs.find((item) => tabKey(item) === key)
  if (!source || !moving) return view
  const remaining = source.tabs.filter((item) => tabKey(item) !== key)
  if ('newPane' in target) {
    if (view.panes.length !== 1 || remaining.length === 0) return view
    const opened = { tabs: [moving], activeTab: moving, temporaryTab: null }
    const old = paneWithTabs(source, remaining)
    return {
      ...view,
      panes: target.newPane === 'left' ? [opened, old] : [old, opened],
      focusedPane: target.newPane === 'left' ? 0 : 1,
    }
  }
  const destination = view.panes[target.pane]
  if (!destination) return view
  const samePane = from === target.pane
  const tabs = samePane ? remaining : [...destination.tabs]
  let at = tabs.length
  if (target.place !== 'end') {
    const neighbour = tabKey(
      'before' in target.place ? target.place.before : target.place.after,
    )
    if (key === neighbour) return view
    at = tabs.findIndex((item) => tabKey(item) === neighbour)
    if (at < 0) return view
    if ('after' in target.place) at += 1
  }
  tabs.splice(at, 0, moving)
  if (samePane && tabs.every((item, index) => item === source.tabs[index]))
    return view
  const kept = source.temporaryTab && tabKey(source.temporaryTab) === key
  if (samePane) {
    return withPanes(
      view,
      view.panes.map((pane, index) =>
        index === from
          ? { ...pane, tabs, temporaryTab: kept ? null : pane.temporaryTab }
          : pane,
      ),
    )
  }
  return withPanes(
    view,
    view.panes.map((pane, index) => {
      if (index === from) return paneWithTabs(source, remaining)
      return { ...pane, tabs, activeTab: moving }
    }),
    target.pane,
  )
}

/** Closes file and diff tabs together. Session records close through the server. */
export function withoutTabs(
  view: WorkspaceView,
  closed: readonly WorkspaceTab[],
): WorkspaceView {
  const keys = new Set(
    closed.filter((tab) => tab.kind !== 'session').map(tabKey),
  )
  let changed = false
  const panes = view.panes.map((pane) => {
    const tabs = pane.tabs.filter((tab) => !keys.has(tabKey(tab)))
    if (tabs.length === pane.tabs.length) return pane
    changed = true
    const next = paneWithTabs(pane, tabs)
    return pane.activeTab && keys.has(tabKey(pane.activeTab))
      ? { ...next, activeTab: null }
      : next
  })
  return changed ? withPanes(view, panes) : view
}
