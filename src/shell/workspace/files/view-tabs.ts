import {
  isFilesTab,
  type FileListKind,
  type FilesTab,
} from '../../../files/navigation'
import type {
  TemporaryTab,
  WorkspaceTab,
  WorkspaceView,
} from '../../../shared/workspace-view'

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
  return (view?.tabs ?? []).filter(isFilesTab)
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
  const mark = view?.temporaryTab ?? null
  return mark !== null && mark.kind === tab.kind && mark.path === tab.path
}

/** The mark of the temporary tab that holds this file or diff. It names no mode. */
function markOf(tab: FilesTab): TemporaryTab {
  return { kind: tab.kind, path: tab.path }
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
  const index = view.tabs.findIndex(
    (open) => isFilesTab(open) && sameFilesTab(open, tab),
  )
  if (index >= 0) {
    const present = equalTabs(view.tabs[index], tab)
    if (present && equalTabs(view.activeTab, tab)) return view
    return { ...view, tabs: replaced(view.tabs, index, tab), activeTab: tab }
  }
  const temporary = view.tabs.findIndex(
    (open) => isFilesTab(open) && isTemporaryTab(view, open),
  )
  const tabs =
    temporary < 0 ? [...view.tabs, tab] : replaced(view.tabs, temporary, tab)
  return { ...view, tabs, activeTab: tab, temporaryTab: markOf(tab) }
}

/**
 * The view where this file or diff tab is a kept tab, after a double-click
 * on its row or on the tab: the mark goes when it names the tab, in any
 * mode, and the tab stays in its place. Each other view stays the same
 * object, so nothing saves.
 */
export function withKeptTab(view: WorkspaceView, tab: FilesTab): WorkspaceView {
  return isTemporaryTab(view, tab) ? { ...view, temporaryTab: null } : view
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
  const tabs = view.tabs.filter(
    (open) => !(isFilesTab(open) && sameFilesTab(open, tab)),
  )
  if (tabs.length === view.tabs.length) return view
  const active = view.activeTab
  const closedActive = isFilesTab(active) && sameFilesTab(active, tab)
  return {
    ...view,
    tabs,
    activeTab: closedActive ? next : active,
    temporaryTab: isTemporaryTab(view, tab) ? null : view.temporaryTab,
  }
}
