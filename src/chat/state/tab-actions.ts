import type { WorkspaceTab } from '../../shared/workspace-view'
import { tabSessions } from './archive-view'
import type { ChatContext } from './context'
import { updateView } from './session-actions'
import { orderSessions } from './sessions'
import { moveTab as moveInView, rowTabs, type TabPlace } from './tab-order'

/** Saves a move, then sorts the open sessions for the next Close action. */
export function moveTab(
  context: ChatContext,
  tab: WorkspaceTab,
  place: TabPlace,
): void {
  const before = context.store.get()
  const row = rowTabs(before.view, tabSessions(before), true)
  updateView(context, (view) => moveInView(view, row, tab, place), true)
  if (context.store.get().view === before.view) return
  context.store.update((snapshot) => ({
    ...snapshot,
    sessions: orderSessions(snapshot.sessions, snapshot.view),
  }))
}
