/**
 * The agent sessions of a workspace. Each session is a chat with its own
 * model, on the same branch and the same cloud computer. A session runs on
 * the agent login of its starter, the member who started it, whoever sends
 * a message.
 */

import { sessionTitleFrom } from '../../../../src/shared/session-title'
import type { AgentKey } from './agents'
import type { PersonKey } from './members'

export type Session = {
  key: string
  /**
   * Its title, or null before it has one. The tab and the history show it
   * through `nameLabel` in `src/shared/`, so a session with no title shows
   * Untitled.
   */
  title: string | null
  /**
   * The text of the first message of a later session, which is each
   * session after the first session of the workspace. Its first line gives
   * the title of the session.
   */
  firstMessage?: string
}

/** A session and its starter, the member who started it. */
export type StartedSession = Session & { starter: PersonKey }

/**
 * The first message of a later session, and the title that it gives. The
 * title comes from `sessionTitleFrom`, the rule that the Worker applies
 * too. No ellipsis marks a cut, but the tab can still shorten the title on
 * screen. A message with no text, such as one with only a screenshot,
 * gives no title, so the session stays Untitled.
 */
function firstMessage(text: string): {
  firstMessage: string
  title: string | null
} {
  return { firstMessage: text, title: sessionTitleFrom(text) }
}

/**
 * The sessions of the open workspace, oldest first. The first session
 * started with no title and took the title of the workspace. A member
 * renamed it later, so it keeps "Address autocomplete", and no automatic
 * title changes it.
 */
export const workspaceSessions: readonly StartedSession[] = [
  { key: 'autocomplete', title: 'Address autocomplete', starter: 'cal' },
  {
    key: 'debounce',
    ...firstMessage('Debounce the address lookups to 250 ms.'),
    starter: 'cal',
  },
]

/**
 * The session that + starts, before its first message. It has no title
 * yet, so its tab shows Untitled.
 */
export const newSession: Session = { key: 'new', title: null }

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
 * opens as the last tab. That message, the draft of Priya, is its first
 * message and gives its title.
 */
export const linkedSession: StartedSession & {
  firstMessage: string
  from: StartedSession
} = {
  key: 'linked',
  ...firstMessage(
    'Show a loading state under the address line while the lookup runs.',
  ),
  starter: 'priya',
  from: workspaceSessions[0],
}

/**
 * A session whose tab the user closed. It keeps its chat, and it reopens
 * as a tab. `agent` is the agent of its last message.
 */
export type ClosedSession = Session & { agent: AgentKey; closed: string }

/**
 * The session history of the open workspace, the last closed first. Each
 * one is a later session, so its first message with text gives its title.
 */
export const closedSessions: readonly ClosedSession[] = [
  {
    key: 'proxy-timeouts',
    ...firstMessage('Why does the places proxy time out on slow networks?'),
    agent: 'claude',
    closed: '1d ago',
  },
  {
    key: 'postcode',
    ...firstMessage(
      'Validate UK postcodes before the lookup, and show an error under the postcode field when one is not valid.',
    ),
    agent: 'codex',
    closed: '1d ago',
  },
  {
    key: 'field-order',
    ...firstMessage(
      'Change the field order on small screens.\nPut the postcode first, so that the suggestions do not cover it.',
    ),
    agent: 'claude',
    closed: '2d ago',
  },
  {
    // Its messages had no text, only a screenshot, so it has no title.
    key: 'untitled',
    ...firstMessage(''),
    agent: 'claude',
    closed: '3d ago',
  },
]
