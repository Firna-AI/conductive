import { tabKey } from '../../shared/workspace-panes'
import { isRunning } from './chat-snapshot'
import { showNotice, type ChatContext } from './context'
import { hydrate } from './history'
import { selectSession } from './session-actions'
import { beginEdit } from './session-records'
import { withSessionTabAt } from './session-tab-places'
import { historySessionIds, shownSessionId } from './pane-selection'

/** Where the tab of a session stood before its close, to put it back. */
function placeBefore(context: ChatContext, sessionId: string) {
  const snapshot = context.store.get()
  const { view } = snapshot
  const key = tabKey({ kind: 'session', sessionId })
  const pane =
    view?.panes.findIndex((pane) =>
      pane.tabs.some((tab) => tabKey(tab) === key),
    ) ?? -1
  return {
    pane: pane === 1 ? (1 as const) : (0 as const),
    paneCount: view?.panes.length ?? 1,
    index:
      view?.panes[pane]?.tabs.findIndex((tab) => tabKey(tab) === key) ?? -1,
    shown: shownSessionId(snapshot, pane) === sessionId,
    focused: view?.focusedPane === pane,
  }
}

/**
 * Closes one session. The tab moves to the history at once, as a pending
 * edit over every record that arrives meanwhile, and the next tab shows.
 * The reply confirms the close and saves the view. A failed close puts the
 * tab back in its place, and shows it again when the close moved the user
 * away from it and the user chose no other tab since.
 */
async function closeSession(
  context: ChatContext,
  sessionId: string,
  stopRunningTurn: boolean,
): Promise<void> {
  const before = placeBefore(context, sessionId)
  const edit = beginEdit(context, sessionId, { closedAt: Date.now() })
  const after = {
    shown: historySessionIds(context.store.get()),
    choices: context.tabChoices.count,
  }
  try {
    const closed = await context.api.closeSession(sessionId, stopRunningTurn)
    edit.confirm(closed.session, closed.eventNumber)
    if (!context.live()) return
    const snapshot = context.store.get()
    const { view } = snapshot
    if (view) context.saveView(view)
    await Promise.all(
      historySessionIds(snapshot).map((id) => hydrate(context, id)),
    )
  } catch (error) {
    if (!context.live()) return
    if (before.index >= 0) {
      context.store.update((snapshot) => ({
        ...snapshot,
        view:
          snapshot.view &&
          withSessionTabAt(
            snapshot.view,
            sessionId,
            before.index,
            before.pane,
            before.paneCount,
          ),
      }))
    }
    edit.fail()
    const untouched =
      context.tabChoices.count === after.choices &&
      JSON.stringify(historySessionIds(context.store.get())) ===
        JSON.stringify(after.shown)
    // The selection changes the store at once, before its history loads.
    const showing =
      before.shown && untouched
        ? selectSession(context, sessionId, before.focused)
        : null
    // The notice of a session shows only with its tab, so a tab that stays
    // hidden gets a notice of the chat.
    const shown = historySessionIds(context.store.get()).includes(sessionId)
    showNotice(
      context,
      shown ? sessionId : null,
      "The session didn't close",
      error,
    )
    await showing
  }
}

/**
 * Closing tabs moves their sessions to the history. Each session with no
 * running turn closes at once. The sessions whose turns run ask first, in
 * one question, because closing stops their turns.
 */
export async function requestClose(
  context: ChatContext,
  sessionIds: readonly string[],
): Promise<void> {
  const snapshot = context.store.get()
  const running = sessionIds.filter((id) => isRunning(snapshot, id))
  if (running.length > 0) {
    context.store.update((current) => ({
      ...current,
      overlay: { kind: 'close', sessionIds: running },
    }))
  }
  const idle = sessionIds.filter((id) => !running.includes(id))
  await Promise.all(idle.map((id) => closeSession(context, id, false)))
}

export async function confirmClose(context: ChatContext): Promise<void> {
  const { overlay } = context.store.get()
  if (overlay.kind !== 'close') return
  context.store.update((snapshot) => ({
    ...snapshot,
    overlay: { kind: 'none' },
  }))
  await Promise.all(
    overlay.sessionIds.map((id) => closeSession(context, id, true)),
  )
}
