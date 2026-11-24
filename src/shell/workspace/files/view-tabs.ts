import { tabKey } from '../../../chat/state/tab-order'
import {
  isFilesTab,
  type FileListKind,
  type FilesTab,
} from '../../../files/navigation'
import type {
  SkillTab,
  TemporaryTab,
  WorkspaceTab,
  WorkspaceView,
} from '../../../shared/workspace-view'

/**
 * A tab that a look opens: a file, a diff, or a skill. Only such a tab can
 * be the temporary tab, and the next look at another file, diff, or skill
 * replaces it.
 */
export type LookTab = FilesTab | SkillTab

/** The same file or diff, in any mode. One tab holds one file or one diff. */
export function sameFilesTab(left: FilesTab, right: FilesTab): boolean {
  return left.kind === right.kind && left.path === right.path
}

/**
 * Whether two tabs are the same tab in the same mode. A file tab has a
 * mode, and its key names none, so two file tabs also compare their modes.
 */
function equalTabs(left: WorkspaceTab | null, right: WorkspaceTab): boolean {
  if (left === null || tabKey(left) !== tabKey(right)) return false
  return (
    left.kind !== 'file' || right.kind !== 'file' || left.mode === right.mode
  )
}

/** The file and diff tabs of a view, in the order of the tab row. */
export function filesTabsOf(view: WorkspaceView | null): FilesTab[] {
  return (view?.tabs ?? []).filter(isFilesTab)
}

/**
 * Whether the view marks this file, diff, or skill tab, in any mode, as its
 * temporary tab: the one tab that the next look at a file, a diff, or a
 * skill with no tab replaces.
 */
export function isTemporaryTab(
  view: WorkspaceView | null,
  tab: LookTab,
): boolean {
  const mark = view?.temporaryTab ?? null
  return mark !== null && tabKey(mark) === tabKey(tab)
}

/** The mark of the temporary tab that holds this tab. It names no mode. */
function markOf(tab: LookTab): TemporaryTab {
  return tab.kind === 'skill'
    ? { kind: 'skill', agent: tab.agent, name: tab.name }
    : { kind: tab.kind, path: tab.path }
}

/** The tabs with `tab` in the place of the tab at `index`. */
function replaced(
  tabs: readonly WorkspaceTab[],
  index: number,
  tab: WorkspaceTab,
): WorkspaceTab[] {
  return tabs.map((open, at) => (at === index ? tab : open))
}

/** The index of the tab with the key of `tab` in the row, or -1. */
function indexOf(
  tabs: readonly WorkspaceTab[],
  tab: WorkspaceTab | TemporaryTab,
): number {
  const key = tabKey(tab)
  return tabs.findIndex((open) => tabKey(open) === key)
}

/**
 * The view with this file, diff, or skill tab open and active, after a
 * press or a visit by address. A tab of the same file, diff, or skill
 * shows, and a file tab takes the place of its other mode. The mark stays,
 * because it names no mode. A file, a diff, or a skill with no tab opens in
 * the temporary tab: in the place of the tab that the mark names, of any of
 * these kinds, else at the end of the row. The mark then names it. A view
 * that shows the tab already stays the same object, so nothing saves.
 */
export function withActiveTab(
  view: WorkspaceView,
  tab: LookTab,
): WorkspaceView {
  const index = indexOf(view.tabs, tab)
  if (index >= 0) {
    const present = equalTabs(view.tabs[index], tab)
    if (present && equalTabs(view.activeTab, tab)) return view
    return { ...view, tabs: replaced(view.tabs, index, tab), activeTab: tab }
  }
  const mark = view.temporaryTab
  const temporary = mark === null ? -1 : indexOf(view.tabs, mark)
  const tabs =
    temporary < 0 ? [...view.tabs, tab] : replaced(view.tabs, temporary, tab)
  return { ...view, tabs, activeTab: tab, temporaryTab: markOf(tab) }
}

/**
 * The view where this file, diff, or skill tab is a kept tab, after a
 * double-click on its row or on the tab: the mark goes when it names the
 * tab, in any mode, and the tab stays in its place. Each other view stays
 * the same object, so nothing saves.
 */
export function withKeptTab(view: WorkspaceView, tab: LookTab): WorkspaceView {
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
 * The view without this file, diff, or skill tab. When it was the active
 * tab, `next` becomes the active tab. When it was the temporary tab, the
 * mark goes too.
 */
export function withoutTab(
  view: WorkspaceView,
  tab: LookTab,
  next: WorkspaceTab | null,
): WorkspaceView {
  const key = tabKey(tab)
  const tabs = view.tabs.filter((open) => tabKey(open) !== key)
  if (tabs.length === view.tabs.length) return view
  const active = view.activeTab
  const closedActive = active !== null && tabKey(active) === key
  return {
    ...view,
    tabs,
    activeTab: closedActive ? next : active,
    temporaryTab: isTemporaryTab(view, tab) ? null : view.temporaryTab,
  }
}
