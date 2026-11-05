/**
 * The agent sessions of a workspace. Each session is a chat with its own
 * model, on the same branch and the same cloud computer.
 */

export type Session = { key: string; title: string }

/** The sessions of the open workspace, oldest first. */
export const workspaceSessions: readonly Session[] = [
  { key: 'autocomplete', title: 'Address autocomplete' },
  { key: 'debounce', title: 'Debounce lookups' },
]

/** The session that + starts, before its first message. */
export const newSession: Session = { key: 'new', title: 'New session' }
