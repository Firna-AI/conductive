import type { WorkspaceTab } from '../../shared/workspace-view'
import type { ChatContext } from './context'
import { updateView } from './session-actions'
import { orderSessions } from './sessions'
import { moveTab as moveInView, type TabTarget } from './tab-order'

/**
 * Saves a move to a place in the row of a pane, or to a new pane, then sorts
 * the open sessions for the next Close action. A move that changes no place,
 * or whose tab or neighbour is in no row, saves nothing, as the pure
 * `moveTab` of `tab-order.ts` says.
 */
export function moveTab(
  context: ChatContext,
  tab: WorkspaceTab,
  target: TabTarget,
): void {
  const before = context.store.get()
  updateView(context, (view) => moveInView(view, tab, target), true)
  if (context.store.get().view === before.view) return
  context.store.update((snapshot) => ({
    ...snapshot,
    sessions: orderSessions(snapshot.sessions, snapshot.view),
  }))
}
