import type { WorkspaceView } from '../../shared/workspace-view'
import { showNotice, type ChatContext } from './context'
import { hydrate } from './history'
import { beginEdit, confirmRecord } from './session-records'
import { viewShowing } from './sessions'
import { sessionTarget } from './pane-selection'
import { moveTab } from './tab-order'

/** The view already shows these tabs, with the same tab open. */
function sameTabs(current: WorkspaceView | null, next: WorkspaceView): boolean {
  return (
    current !== null &&
    current.focusedPane === next.focusedPane &&
    JSON.stringify(current.panes) === JSON.stringify(next.panes)
  )
}

/**
 * Shows a session in the chat, saves the view, and loads the session's
 * history once. The promise ends when the history has loaded. Each call is
 * a choice of a shown session, which an older address lookup yields to.
 */
export async function selectSession(
  context: ChatContext,
  sessionId: string,
  focus = true,
): Promise<void> {
  context.tabChoices.count += 1
  const snapshot = context.store.get()
  if (!snapshot.sessions.some((item) => item.id === sessionId)) return
  const view = viewShowing(snapshot.view, sessionId, focus)
  if (sameTabs(snapshot.view, view)) {
    await hydrate(context, sessionId)
    return
  }
  context.store.update((current) => ({
    ...current,
    view,
    overlay: { kind: 'none' },
  }))
  context.saveView(view)
  await hydrate(context, sessionId)
}

/**
 * Changes the view with a change of the app, such as an open file tab.
 * With `save`, it saves the view through the same writer as the session
 * tabs. Without it, as in a read-only workspace, the view changes in the
 * browser only, as the session tabs do. Until the load reads the view, the
 * saved tabs are unknown, so it changes nothing. A change that returns the
 * same view saves nothing.
 */
export function updateView(
  context: ChatContext,
  change: (view: WorkspaceView) => WorkspaceView,
  save: boolean,
): void {
  if (!context.live()) return
  const current = context.store.get().view
  if (current === null) return
  const view = change(current)
  if (view === current) return
  if (
    view.focusedPane !== current.focusedPane ||
    view.panes.some(
      (pane, index) => pane.activeTab !== current.panes[index]?.activeTab,
    )
  )
    context.tabChoices.count += 1
  context.store.update((latest) => ({ ...latest, view }))
  if (save) context.saveView(view)
}

/** Shows a session that an action opened, when it is open now. */
async function showIfOpen(
  context: ChatContext,
  sessionId: string,
  pane?: 0 | 1,
) {
  const open = context.store
    .get()
    .sessions.some((item) => item.id === sessionId)
  if (!open) return
  if (pane !== undefined)
    updateView(
      context,
      (view) =>
        moveTab(view, { kind: 'session', sessionId }, { pane, place: 'end' }),
      true,
    )
  await selectSession(context, sessionId)
}

/**
 * "+" starts a session on the same branch and cloud computer, with the
 * default model of the user's account.
 */
export async function newSession(
  context: ChatContext,
  pane?: 0 | 1,
): Promise<void> {
  if (pane !== undefined)
    updateView(
      context,
      (view) => (view.panes[pane] ? { ...view, focusedPane: pane } : view),
      true,
    )
  const snapshot = context.store.get()
  const destination = snapshot.view?.focusedPane
  const shown = snapshot.sessions.find(
    (item) => item.id === sessionTarget(snapshot),
  )
  const choice =
    snapshot.account?.defaultChoice ??
    shown?.choice ??
    snapshot.workspace?.choice
  if (!choice) return
  try {
    const { session, eventNumber } = await context.api.createSession(choice)
    confirmRecord(context, session, eventNumber)
    if (context.live()) await showIfOpen(context, session.id, destination)
  } catch (error) {
    showNotice(context, null, "The new session didn't open", error)
  }
}

/**
 * Renames a session. The new name shows at once as a pending edit, over
 * every record that arrives meanwhile. Confirmation retires this rename and
 * older renames. A failed rename takes back only its own edit.
 */
export async function renameSession(
  context: ChatContext,
  sessionId: string,
  title: string,
): Promise<void> {
  const name = title.trim()
  const session = context.store
    .get()
    .sessions.find((item) => item.id === sessionId)
  context.store.update((snapshot) => ({
    ...snapshot,
    overlay: { kind: 'none' },
  }))
  if (!session || name === '' || name === session.title) return
  const edit = beginEdit(context, sessionId, { title: name })
  try {
    const saved = await context.api.renameSession(sessionId, name)
    edit.confirm(saved.session, saved.eventNumber)
  } catch (error) {
    edit.fail()
    showNotice(context, sessionId, "The new name didn't save", error)
  }
}

/** Reopens a session of the history as a tab, with its chat. */
export async function reopenSession(
  context: ChatContext,
  sessionId: string,
): Promise<void> {
  const pane = context.store.get().view?.focusedPane
  context.store.update((snapshot) => ({
    ...snapshot,
    overlay: { kind: 'none' },
  }))
  try {
    const reopened = await context.api.reopenSession(sessionId)
    if (!context.live()) return
    confirmRecord(context, reopened.session, reopened.eventNumber)
    await showIfOpen(context, sessionId, pane)
  } catch (error) {
    showNotice(context, null, "The session didn't reopen", error)
  }
}
