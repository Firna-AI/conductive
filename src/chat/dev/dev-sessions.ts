import { chatHistoryPath } from '../../shared/events'
import type { Session } from '../../shared/sessions'
import type { DevBackend } from './dev-backend'

/** Places a session among the tabs or in the history, and tells the tabs. */
export function place(backend: DevBackend, session: Session): void {
  const others = (items: Session[]) =>
    items.filter((item) => item.id !== session.id)
  if (session.closedAt === null) {
    backend.open = [...others(backend.open), session]
    backend.closed = others(backend.closed)
  } else {
    backend.open = others(backend.open)
    backend.closed = [session, ...others(backend.closed)]
  }
  backend.stream.emit({ type: 'session.updated', session })
  backend.sync()
}

/** The record of a session as the page holds it now. */
export function recordOf(
  backend: DevBackend,
  sessionId: string,
): Session | undefined {
  return [...backend.open, ...backend.closed].find(
    (item) => item.id === sessionId,
  )
}

/**
 * Names the active turn of a session in its record, with its start time, or
 * no turn after its end, as the Worker does. The chat ends a turn that a
 * newer record no longer names.
 */
export function setActiveTurn(
  backend: DevBackend,
  sessionId: string,
  turnId: string | null,
  startedAt: number | null,
): void {
  const session = recordOf(backend, sessionId)
  if (!session || session.activeTurnId === turnId) return
  place(backend, {
    ...session,
    activeTurnId: turnId,
    activeTurnStartedAt: turnId === null ? null : startedAt,
  })
}

/** An accepted message ends the retry of its session, as the Worker does. */
export function clearRetry(backend: DevBackend, sessionId: string): void {
  const session = recordOf(backend, sessionId)
  if (session && session.retryMessageId !== null) {
    place(backend, { ...session, retryMessageId: null })
  }
}

/**
 * A new session that the reader of the page starts, as its starter. `id` is
 * the ID that the chat chose, and `source` the session that a linked session
 * points to. Its record takes the reader's login of its agent, as the Worker
 * records it: available while connected, and shared unless the reader keeps
 * it private. Without a connected login, it is neither.
 */
export function newSession(
  backend: DevBackend,
  choice: Session['choice'],
  options: { id?: string; source?: string } = {},
): Session {
  const login = backend.logins.find((item) => item.agent === choice.agent)
  backend.count += 1
  const { orgId, workspaceId } = backend.target
  const session: Session = {
    id: options.id ?? `dev-session-${backend.count}`,
    workspaceId,
    title: 'New session',
    choice,
    createdAt: backend.clock.now(),
    closedAt: null,
    activeTurnId: null,
    activeTurnStartedAt: null,
    retryMessageId: null,
    startedBy: backend.viewer,
    sourceSessionId: options.source ?? null,
    loginAvailable: login?.connected ?? false,
    loginShared: login?.connected === true && !login.noReuse,
  }
  backend.server.json('GET', chatHistoryPath(orgId, workspaceId, session.id), {
    events: [],
    throughEventNumber: backend.stream.last,
  })
  place(backend, session)
  return session
}

/**
 * The session where a message of the reader goes, as the Worker chooses it.
 * The session itself takes it while its starter shares a login that works,
 * or when the reader started it. Otherwise a new linked session on the
 * reader's own login takes it, and the first session names no retry any
 * more.
 */
export function targetOf(backend: DevBackend, session: Session): Session {
  const { startedBy } = session
  const own = startedBy !== null && startedBy.id === backend.viewer.id
  const shared = session.loginAvailable && session.loginShared
  if (own || (startedBy !== null && shared)) return session
  const linked = newSession(backend, session.choice, { source: session.id })
  clearRetry(backend, session.id)
  return linked
}

/**
 * The title that the agent writes after its first answer in a new
 * workspace. The workspace takes it as its name. The first session of the
 * workspace takes it too, while it still has the name that the workspace
 * had, so a name that a user gave the session stays. The backend gives
 * these titles. This page does the same, so its tabs match the mockups.
 */
export function writeTitle(backend: DevBackend, name: string): void {
  const previous = backend.workspace.name
  backend.workspace = { ...backend.workspace, name }
  backend.stream.emit({ type: 'workspace.title', name })
  const first = [...backend.open, ...backend.closed].find(
    (session) => session.id === backend.titled,
  )
  if (first && first.title === previous) {
    place(backend, { ...first, title: name })
  } else {
    backend.sync()
  }
}

/**
 * A new workspace: its first session takes the workspace name, as the
 * backend gives it, and the agent's first answer writes the title.
 */
export function followTitle(backend: DevBackend): void {
  const [first] = backend.open
  if (first) {
    backend.titled = first.id
    backend.open = [
      { ...first, title: backend.workspace.name },
      ...backend.open.slice(1),
    ]
    backend.sync()
  }
  backend.agent.onAnswer = () => {
    if (backend.workspace.name !== 'Saved carts') {
      writeTitle(backend, 'Saved carts')
    }
  }
}
