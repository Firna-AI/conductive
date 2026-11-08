import type { WorkspaceView } from '../../shared/workspace-view'
import { isArchived } from './archive-view'
import { isRunning } from './chat-snapshot'
import { showNotice, type ChatContext } from './context'
import { hydrate } from './history'
import { beginEdit, confirmRecord } from './session-records'
import { viewShowing } from './sessions'

/** The view already shows these tabs, with the same tab open. */
function sameTabs(current: WorkspaceView | null, next: WorkspaceView): boolean {
  return (
    current !== null &&
    current.tabs.length === next.tabs.length &&
    JSON.stringify(current.activeTab) === JSON.stringify(next.activeTab)
  )
}

/**
 * Shows a session in the chat, saves the view, and loads the session's
 * history once. The promise ends when the history has loaded.
 */
export async function selectSession(
  context: ChatContext,
  sessionId: string,
): Promise<void> {
  const snapshot = context.store.get()
  if (!snapshot.sessions.some((item) => item.id === sessionId)) return
  const view = viewShowing(snapshot.view, sessionId)
  if (snapshot.activeSessionId === sessionId && sameTabs(snapshot.view, view)) {
    await hydrate(context, sessionId)
    return
  }
  context.store.update((current) => ({
    ...current,
    activeSessionId: sessionId,
    view,
    overlay: { kind: 'none' },
  }))
  context.saveView(view)
  await hydrate(context, sessionId)
}

/**
 * Changes the view with a change of the app, such as an open file tab, and
 * saves it through the same writer as the session tabs. Until the load
 * reads the view, the saved tabs are unknown, so it changes nothing. A
 * change that returns the same view saves nothing. An archived workspace
 * changes its view in the browser only, as its session tabs do.
 */
export function updateView(
  context: ChatContext,
  change: (view: WorkspaceView) => WorkspaceView,
): void {
  if (!context.live()) return
  const snapshot = context.store.get()
  const current = snapshot.view
  if (current === null) return
  const view = change(current)
  if (view === current) return
  context.store.update((latest) => ({ ...latest, view }))
  if (!isArchived(snapshot)) context.saveView(view)
}

/** Shows a session that an action opened, when it is open now. */
async function showIfOpen(context: ChatContext, sessionId: string) {
  const open = context.store
    .get()
    .sessions.some((item) => item.id === sessionId)
  if (open) await selectSession(context, sessionId)
}

/**
 * "+" starts a session on the same branch and cloud computer, with the
 * default model of the user's account.
 */
export async function newSession(context: ChatContext): Promise<void> {
  const snapshot = context.store.get()
  const shown = snapshot.sessions.find(
    (item) => item.id === snapshot.activeSessionId,
  )
  const choice =
    snapshot.account?.defaultChoice ??
    shown?.choice ??
    snapshot.workspace?.choice
  if (!choice) return
  try {
    const { session, eventNumber } = await context.api.createSession(choice)
    confirmRecord(context, session, eventNumber)
    if (context.live()) await showIfOpen(context, session.id)
  } catch (error) {
    showNotice(context, null, "The new session didn't open", error)
  }
}

/**
 * Renames a session. The new name shows at once as a pending edit, over
 * every record that arrives meanwhile, until the reply confirms it or the
 * request fails. A failed rename takes back only its own edit.
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
  const end = beginEdit(context, sessionId, { title: name })
  try {
    const saved = await context.api.renameSession(sessionId, name)
    confirmRecord(context, saved.session, saved.eventNumber)
    end()
  } catch (error) {
    end()
    showNotice(context, sessionId, "The new name didn't save", error)
  }
}

async function closeSession(
  context: ChatContext,
  sessionId: string,
  stopRunningTurn: boolean,
): Promise<void> {
  try {
    const closed = await context.api.closeSession(sessionId, stopRunningTurn)
    if (!context.live()) return
    confirmRecord(context, closed.session, closed.eventNumber)
    const { view, activeSessionId } = context.store.get()
    if (view) context.saveView(view)
    if (activeSessionId) await hydrate(context, activeSessionId)
  } catch (error) {
    showNotice(context, sessionId, "The session didn't close", error)
  }
}

/**
 * Closing a tab moves its session to the history. A session whose turn runs
 * asks first, because closing stops the turn.
 */
export async function requestClose(
  context: ChatContext,
  sessionId: string,
): Promise<void> {
  if (isRunning(context.store.get(), sessionId)) {
    context.store.update((snapshot) => ({
      ...snapshot,
      overlay: { kind: 'close', sessionId },
    }))
    return
  }
  await closeSession(context, sessionId, false)
}

export async function confirmClose(context: ChatContext): Promise<void> {
  const { overlay } = context.store.get()
  if (overlay.kind !== 'close') return
  context.store.update((snapshot) => ({
    ...snapshot,
    overlay: { kind: 'none' },
  }))
  await closeSession(context, overlay.sessionId, true)
}

/** Reopens a session of the history as a tab, with its chat. */
export async function reopenSession(
  context: ChatContext,
  sessionId: string,
): Promise<void> {
  context.store.update((snapshot) => ({
    ...snapshot,
    overlay: { kind: 'none' },
  }))
  try {
    const reopened = await context.api.reopenSession(sessionId)
    if (!context.live()) return
    confirmRecord(context, reopened.session, reopened.eventNumber)
    await showIfOpen(context, sessionId)
  } catch (error) {
    showNotice(context, null, "The session didn't reopen", error)
  }
}
