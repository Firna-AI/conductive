import {
  isFilesTab,
  type FileListKind,
  type FilesTab,
} from '../../../files/navigation'
import type {
  WorkspaceTab,
  WorkspaceView,
} from '../../../shared/workspace-view'

import {
  allTabs,
  focusedPane,
  paneWithTabs,
  updatePane,
  withPanes,
} from '../../../shared/workspace-panes'

/** The same file or diff, in any mode. One tab holds one file or one diff. */
export function sameFilesTab(left: FilesTab, right: FilesTab): boolean {
  return left.kind === right.kind && left.path === right.path
}

/** Whether two tabs are the same tab in the same mode. */
function equalTabs(left: WorkspaceTab | null, right: WorkspaceTab): boolean {
  if (left === null) return false
  switch (right.kind) {
    case 'session':
      return left.kind === 'session' && left.sessionId === right.sessionId
    case 'file':
      return (
        left.kind === 'file' &&
        left.path === right.path &&
        left.mode === right.mode
      )
    case 'diff':
      return left.kind === 'diff' && left.path === right.path
  }
}

/** The file and diff tabs of a view, in the order of the tab row. */
export function filesTabsOf(view: WorkspaceView | null): FilesTab[] {
  return allTabs(view).filter(isFilesTab)
}

/**
 * Whether the view marks this file or diff tab, in any mode, as its
 * temporary tab: the one tab that the next press on a file or a diff with
 * no tab replaces.
 */
export function isTemporaryTab(
  view: WorkspaceView | null,
  tab: FilesTab,
): boolean {
  return (
    view?.panes.some((pane) => {
      const mark = pane.temporaryTab
      return mark !== null && mark.kind === tab.kind && mark.path === tab.path
    }) ?? false
  )
}

/** The tabs with `tab` in the place of the tab at `index`. */
function replaced(
  tabs: readonly WorkspaceTab[],
  index: number,
  tab: WorkspaceTab,
): WorkspaceTab[] {
  return tabs.map((open, at) => (at === index ? tab : open))
}

/**
 * The view with this file or diff tab open and active, after a press or a
 * visit by address. A tab of the same file or diff shows, and it takes the
 * place of its other mode. The mark stays, because it names no mode. A file
 * or a diff with no tab opens in the temporary tab: in the place of the tab
 * that the mark names, else at the end of the row. The mark then names it.
 * A view that shows the tab already stays the same object, so nothing
 * saves.
 */
export function withActiveTab(
  view: WorkspaceView,
  tab: FilesTab,
): WorkspaceView {
  const owner = view.panes.findIndex((pane) =>
    pane.tabs.some((open) => isFilesTab(open) && sameFilesTab(open, tab)),
  )
  const target = owner < 0 ? view.focusedPane : owner
  const pane = view.panes[target] ?? focusedPane(view)
  const index = pane.tabs.findIndex(
    (open) => isFilesTab(open) && sameFilesTab(open, tab),
  )
  if (
    index >= 0 &&
    equalTabs(pane.tabs[index], tab) &&
    equalTabs(pane.activeTab, tab) &&
    view.focusedPane === target
  )
    return view
  const changed = updatePane(view, target, (pane) => {
    if (index >= 0)
      return { ...pane, tabs: replaced(pane.tabs, index, tab), activeTab: tab }
    const temporary = pane.tabs.findIndex(
      (open) =>
        pane.temporaryTab !== null &&
        open.kind === pane.temporaryTab.kind &&
        open.path === pane.temporaryTab.path,
    )
    return {
      ...pane,
      tabs:
        temporary < 0
          ? [...pane.tabs, tab]
          : replaced(pane.tabs, temporary, tab),
      activeTab: tab,
      temporaryTab: { kind: tab.kind, path: tab.path },
    }
  })
  return { ...changed, focusedPane: target === 1 ? 1 : 0 }
}

/**
 * The view where this file or diff tab is a kept tab, after a double-click
 * on its row or on the tab: the mark goes when it names the tab, in any
 * mode, and the tab stays in its place. Each other view stays the same
 * object, so nothing saves.
 */
export function withKeptTab(view: WorkspaceView, tab: FilesTab): WorkspaceView {
  const index = view.panes.findIndex(
    (pane) =>
      pane.temporaryTab?.kind === tab.kind &&
      pane.temporaryTab.path === tab.path,
  )
  return updatePane(view, index, (pane) => ({ ...pane, temporaryTab: null }))
}

/** The view with this list in the Files panel. */
export function withFileList(
  view: WorkspaceView,
  list: FileListKind,
): WorkspaceView {
  return view.fileList === list ? view : { ...view, fileList: list }
}

/**
 * The view without this file or diff tab. When it was the active tab,
 * `next` becomes the active tab. When it was the temporary tab, the mark
 * goes too.
 */
export function withoutTab(
  view: WorkspaceView,
  tab: FilesTab,
  next: WorkspaceTab | null,
): WorkspaceView {
  const owner = view.panes.findIndex((pane) =>
    pane.tabs.some((open) => isFilesTab(open) && sameFilesTab(open, tab)),
  )
  if (owner < 0) return view
  return withPanes(
    view,
    view.panes.map((pane, index) => {
      if (index !== owner) return pane
      const tabs = pane.tabs.filter(
        (open) => !(isFilesTab(open) && sameFilesTab(open, tab)),
      )
      const repaired = paneWithTabs(pane, tabs)
      const closedActive =
        isFilesTab(pane.activeTab) && sameFilesTab(pane.activeTab, tab)
      const localNext =
        next && tabs.some((open) => equalTabs(open, next)) ? next : null
      return {
        ...repaired,
        activeTab: closedActive ? localNext : pane.activeTab,
      }
    }),
  )
}
