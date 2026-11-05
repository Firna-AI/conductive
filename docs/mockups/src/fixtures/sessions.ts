/**
 * The agent sessions of a workspace. Each session is a chat with its own
 * model, on the same branch and the same cloud computer.
 */

import type { AgentKey } from './agents'

export type Session = { key: string; title: string }

/** The sessions of the open workspace, oldest first. */
export const workspaceSessions: readonly Session[] = [
  { key: 'autocomplete', title: 'Address autocomplete' },
  { key: 'debounce', title: 'Debounce lookups' },
]

/** The session that + starts, before its first message. */
export const newSession: Session = { key: 'new', title: 'New session' }

/**
 * A session whose tab the user closed. It keeps its chat, and it reopens
 * as a tab. `agent` is the agent of its last message.
 */
export type ClosedSession = Session & { agent: AgentKey; closed: string }

/** The session history of the open workspace, the last closed first. */
export const closedSessions: readonly ClosedSession[] = [
  {
    key: 'proxy-timeouts',
    title: 'Places proxy timeouts',
    agent: 'claude',
    closed: '1d ago',
  },
  {
    key: 'postcode',
    title: 'Postcode validation for the UK',
    agent: 'codex',
    closed: '1d ago',
  },
  {
    key: 'field-order',
    title: 'Field order on small screens',
    agent: 'claude',
    closed: '2d ago',
  },
  { key: 'untitled', title: 'Untitled', agent: 'claude', closed: '3d ago' },
]
