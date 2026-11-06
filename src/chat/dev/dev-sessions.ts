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
