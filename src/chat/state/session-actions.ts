import type { Session } from '../../shared/sessions'
import type { WorkspaceView } from '../../shared/workspace-view'
import { isRunning } from './chat-snapshot'
import { hydrate, showNotice, type ChatContext } from './context'
import { placeSession, viewShowing } from './sessions'

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

function showSession(context: ChatContext, session: Session): Promise<void> {
  context.store.update((snapshot) => placeSession(snapshot, session))
  return selectSession(context, session.id)
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
    const session = await context.api.createSession(choice)
    if (context.live()) await showSession(context, session)
  } catch (error) {
    showNotice(context, null, "The new session didn't open", error)
  }
}

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
  context.store.update((snapshot) =>
    placeSession(snapshot, { ...session, title: name }),
  )
  try {
    const saved = await context.api.renameSession(sessionId, name)
    if (context.live())
      context.store.update((snapshot) => placeSession(snapshot, saved))
  } catch (error) {
    if (!context.live()) return
    context.store.update((snapshot) => {
      const current = snapshot.sessions.find((item) => item.id === sessionId)
      return current
        ? placeSession(snapshot, { ...current, title: session.title })
        : snapshot
    })
    showNotice(context, sessionId, "The new name didn't save", error)
  }
}

async function closeSession(
  context: ChatContext,
  sessionId: string,
  stopRunningTurn: boolean,
): Promise<void> {
  try {
    const session = await context.api.closeSession(sessionId, stopRunningTurn)
    if (!context.live()) return
    context.store.update((snapshot) => placeSession(snapshot, session))
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
    const session = await context.api.reopenSession(sessionId)
    if (!context.live()) return
    if (session.closedAt === null) await showSession(context, session)
    else context.store.update((snapshot) => placeSession(snapshot, session))
  } catch (error) {
    showNotice(context, null, "The session didn't reopen", error)
  }
}
