import type { WorkspaceTab } from '../../shared/workspace-view'
import { rowKey, type RowTab } from './tab-row'

/** What Close tabs to the right does with each kind of tab. */
export interface CloseRightActions {
  /** Shows a session tab, as a click on it does. */
  onSelect: (id: string) => void
  /** Closes session tabs, as their Close does, with one question for each running session. */
  onClose: (...ids: string[]) => void
  /** Closes file and diff tabs of the host in one change of the saved view. */
  onCloseTabs: (tabs: readonly WorkspaceTab[]) => void
}

/** Shows a tab of the row, as a plain click on it does. */
function showTab(tab: RowTab, actions: CloseRightActions): void {
  if (tab.kind === 'session') actions.onSelect(tab.id)
  else tab.show()
}

/**
 * Closes every tab after `tab` in the row, as Close tabs to the right of a
 * browser does. When the shown tab is among them, `tab` shows first, so no
 * close picks another tab to show. Then the file and diff tabs close in one
 * change of the view, and the session tabs close as their Close does: a
 * running session asks first, in one question for all of them.
 */
export function closeTabsRight(
  tabs: readonly RowTab[],
  tab: RowTab,
  actions: CloseRightActions,
): void {
  const key = rowKey(tab)
  const index = tabs.findIndex((item) => rowKey(item) === key)
  if (index < 0) return
  const right = tabs.slice(index + 1)
  if (right.length === 0) return
  if (right.some((item) => item.selected)) showTab(tab, actions)
  const files = right.flatMap((item) =>
    item.kind === 'host' ? [item.tab] : [],
  )
  if (files.length > 0) actions.onCloseTabs(files)
  const sessions = right.flatMap((item) =>
    item.kind === 'session' ? [item.id] : [],
  )
  if (sessions.length > 0) actions.onClose(...sessions)
}
