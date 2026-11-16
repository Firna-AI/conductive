import type { WorkspaceTab } from '../../shared/workspace-view'
import { rowKey, type RowTab } from './tab-row'

/** What a close of several tabs of the row does with each kind of tab. */
export interface CloseTabsActions {
  /** Shows a session tab, as a click on it does. */
  onSelect: (id: string) => void
  /** Closes session tabs, as their Close does, with one question for each running session. */
  onClose: (...ids: string[]) => void
  /** Closes file and diff tabs of the host in one change of the saved view. */
  onCloseTabs: (tabs: readonly WorkspaceTab[]) => void
}

/** Shows a tab of the row, as a plain click on it does. */
function showTab(tab: RowTab, actions: CloseTabsActions): void {
  if (tab.kind === 'session') actions.onSelect(tab.id)
  else tab.show()
}

/**
 * Closes the `closing` tabs of the row, which never hold `tab`. When the
 * shown tab is among them, `tab` shows first, so no close picks another tab
 * to show. Then the file and diff tabs close in one change of the view, and
 * the session tabs close as their Close does: a running session asks first,
 * in one question for all of them.
 */
function closeTabs(
  tab: RowTab,
  closing: readonly RowTab[],
  actions: CloseTabsActions,
): void {
  if (closing.length === 0) return
  if (closing.some((item) => item.selected)) showTab(tab, actions)
  const files = closing.flatMap((item) =>
    item.kind === 'host' ? [item.tab] : [],
  )
  if (files.length > 0) actions.onCloseTabs(files)
  const sessions = closing.flatMap((item) =>
    item.kind === 'session' ? [item.id] : [],
  )
  if (sessions.length > 0) actions.onClose(...sessions)
}

/**
 * Closes every tab after `tab` in the row, as Close tabs to the right of a
 * browser does, through `closeTabs`.
 */
export function closeTabsRight(
  tabs: readonly RowTab[],
  tab: RowTab,
  actions: CloseTabsActions,
): void {
  const key = rowKey(tab)
  const index = tabs.findIndex((item) => rowKey(item) === key)
  if (index < 0) return
  closeTabs(tab, tabs.slice(index + 1), actions)
}

/**
 * Closes every tab of the row but `tab`, as Close other tabs of a browser
 * does, through `closeTabs`.
 */
export function closeOtherTabs(
  tabs: readonly RowTab[],
  tab: RowTab,
  actions: CloseTabsActions,
): void {
  const key = rowKey(tab)
  if (!tabs.some((item) => rowKey(item) === key)) return
  closeTabs(
    tab,
    tabs.filter((item) => rowKey(item) !== key),
    actions,
  )
}
