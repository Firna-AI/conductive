import type { WorkspaceTab } from '../../shared/workspace-view'
import { tabKey } from '../../shared/workspace-panes'
import { tabSessions } from './archive-view'
import type { ChatContext } from './context'
import { updateView } from './session-actions'
import { orderSessions } from './sessions'
import {
  moveTab as moveInView,
  rowTabs,
  type TabPlace,
  type TabTarget,
} from './tab-order'

/** Saves a move, then sorts the open sessions for the next Close action. */
export function moveTab(
  context: ChatContext,
  tab: WorkspaceTab,
  place: TabPlace | TabTarget,
): void {
  const before = context.store.get()
  let target: TabTarget
  if ('pane' in place || 'newPane' in place) target = place
  else {
    const row = rowTabs(before.view, tabSessions(before), true)
    const neighbour = 'before' in place ? place.before : place.after
    if (
      ![tab, neighbour].every((item) =>
        row.some((open) => tabKey(open) === tabKey(item)),
      )
    )
      return
    target = { pane: before.view?.focusedPane ?? 0, place }
  }
  updateView(context, (view) => moveInView(view, tab, target), true)
  if (context.store.get().view === before.view) return
  context.store.update((snapshot) => ({
    ...snapshot,
    sessions: orderSessions(snapshot.sessions, snapshot.view),
  }))
}
