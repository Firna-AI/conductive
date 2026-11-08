import {
  isFilesTab,
  type FileListKind,
  type FilesTab,
} from '../../../files/navigation'
import type {
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
 * The view with this file or diff tab open and active. The tab of the same
 * file takes the place of its other mode. A view that shows it already
 * stays the same object, so nothing saves.
 */
export function withActiveTab(
  view: WorkspaceView,
  tab: FilesTab,
): WorkspaceView {
  const index = view.tabs.findIndex(
    (open) => isFilesTab(open) && sameFilesTab(open, tab),
  )
  const present = index >= 0 && equalTabs(view.tabs[index], tab)
  if (present && equalTabs(view.activeTab, tab)) return view
  const tabs =
    index < 0
      ? [...view.tabs, tab]
      : view.tabs.map((open, at) => (at === index ? tab : open))
  return { ...view, tabs, activeTab: tab }
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
 * `next` becomes the active tab.
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
  return { ...view, tabs, activeTab: closedActive ? next : active }
}
