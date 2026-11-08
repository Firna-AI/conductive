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
  title: string
  /**
   * The text of the first message of a later session, which is each
   * session after the first session of the workspace. Its first line gives
   * the title of the session.
   */
  firstMessage?: string
}

/** A session and its starter, the member who started it. */
export type StartedSession = Session & { starter: PersonKey }

/** The title of a session before a first message with text. */
const defaultTitle = 'New session'

/**
 * The first message of a later session, and the title that it gives. The
 * title comes from `sessionTitleFrom`, the rule that the Worker applies
 * too. No ellipsis marks a cut, but the tab can still shorten the title on
 * screen. A message with no text, such as one with only a screenshot,
 * keeps the default title.
 */
function firstMessage(text: string): { firstMessage: string; title: string } {
  return { firstMessage: text, title: sessionTitleFrom(text) ?? defaultTitle }
}

/**
 * The sessions of the open workspace, oldest first. The first session took
 * the workspace name and then the agent's title. A member renamed it later,
 * so it keeps "Address autocomplete" and no longer follows the workspace
 * name.
 */
export const workspaceSessions: readonly StartedSession[] = [
  { key: 'autocomplete', title: 'Address autocomplete', starter: 'cal' },
  {
    key: 'debounce',
    ...firstMessage('Debounce the address lookups to 250 ms.'),
    starter: 'cal',
  },
]

/** The session that + starts, before its first message. */
export const newSession: Session = { key: 'new', title: defaultTitle }

/**
 * The session that a message of Priya opened from the first session, after
 * the Claude login of Cal, its starter, became unavailable. It starts empty,
 * runs on the own login of Priya, and links to the first session, which
 * stays as it was. It opens as the last tab. That message, the draft of
 * Priya, is its first message and gives its title.
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
 * one is a later session, so its first message gives its title.
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
    // The first message had only a screenshot, and no text.
    key: 'untitled',
    ...firstMessage(''),
    agent: 'claude',
    closed: '3d ago',
  },
]
