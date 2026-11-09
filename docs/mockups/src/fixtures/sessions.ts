/**
 * The agent sessions of a workspace. Each session is a chat with its own
 * model, on the same branch and the same cloud computer. A session runs on
 * the agent login of its starter, the member who started it, whoever sends
 * a message.
 */

import type { AgentKey } from './agents'
import type { PersonKey } from './members'

export type Session = { key: string; title: string }

/** A session and its starter, the member who started it. */
export type StartedSession = Session & { starter: PersonKey }

/** The sessions of the open workspace, oldest first. */
export const workspaceSessions: readonly StartedSession[] = [
  { key: 'autocomplete', title: 'Address autocomplete', starter: 'cal' },
  { key: 'debounce', title: 'Debounce lookups', starter: 'cal' },
]

/** The session that + starts, before its first message. */
export const newSession: Session = { key: 'new', title: 'New session' }

/**
 * More open sessions of the workspace, oldest first, for a row with more
 * tabs than fit. None of them is in the session history.
 */
export const moreSessions: readonly Session[] = [
  { key: 'keyboard', title: 'Keyboard navigation' },
  { key: 'no-results', title: 'No results message' },
  { key: 'loading', title: 'Loading state' },
  { key: 'analytics', title: 'Autocomplete analytics' },
]

/**
 * The session that a message of Priya opened from the first session,
 * because the Claude login of Cal, its starter, was not available, or Cal
 * did not let other members use it. It starts empty, runs on the own login
 * of Priya, and links to the first session, which stays as it was. It
 * opens as the last tab.
 */
export const linkedSession: StartedSession & { from: StartedSession } = {
  key: 'linked',
  title: newSession.title,
  starter: 'priya',
  from: workspaceSessions[0],
}

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
