/**
 * The side questions about the chat of Address autocomplete, the first
 * session of Checkout address autocomplete. A side question is a normal
 * session with an anchor: the parent session, the message, and the quoted
 * text. Its first message holds the prompt, then the quote, then the link
 * of the parent session, so the prompt gives its title.
 */

import { sessionTitleFrom } from '../../../../src/shared/session-title'
import type { ChatItem } from './conversations'
import type { PersonKey } from './members'
import {
  agent,
  allowedByCal,
  call,
  counted,
  run,
  working,
} from './secretChatParts'
import { replicaRequest } from './secretRequests'
import { autocompleteSessions, sessionLink } from './sessionLinks'

/**
 * The messages of the parent chat that side questions quote: the first
 * message of Cal, and the answer of the agent at the end of the turn.
 */
export type QuotedMessage = 'ask' | 'done'

export type SideQuestion = {
  /** The key of the side session, which its tab uses. */
  key: string
  /** The message of the parent chat that holds the quote. */
  message: QuotedMessage
  /**
   * The quoted text as the fixture of the message writes it. The app
   * stores the rendered text of the selection, with some text before and
   * after it.
   */
  quote: string
  /** What the member asks: the first line of the first message. */
  prompt: string
  /** The title of the side session, which its first line gives. */
  title: string | null
  /** The member who asked, who started the side session. */
  starter: PersonKey
}

function question(
  key: string,
  message: QuotedMessage,
  quote: string,
  prompt: string,
  starter: PersonKey,
): SideQuestion {
  const title = sessionTitleFrom(prompt)
  return { key, message, quote, prompt, title, starter }
}

/**
 * The side questions that the mockups draw. Cal asks `count` about a line
 * of the answer, which the flow follows. `lookup` and `proxy` are side
 * questions of Cal and Priya in other states, and `match` lies inside the
 * quote of `count`, so their marks overlap.
 */
export const sideQuestions = {
  count: question(
    'side-count',
    'done',
    'Manual entry still works when there is no match.',
    'How many saved addresses have no postcode?',
    'cal',
  ),
  lookup: question(
    'side-lookup',
    'done',
    'Removed the old postcode lookup',
    'Does anything else still import the postcode lookup?',
    'cal',
  ),
  proxy: question(
    'side-proxy',
    'ask',
    'Use the places proxy at `/api/places`',
    'Is the places proxy rate limited?',
    'priya',
  ),
  match: question(
    'side-match',
    'done',
    'when there is no match',
    'What counts as no match?',
    'priya',
  ),
} as const satisfies Record<string, SideQuestion>

/** The text that Cal selects in his own first message of the parent chat. */
export const selectedInMessage = 'keep the manual fields as a fallback'

/**
 * The first message of a side session: the prompt, the quote as a Markdown
 * quote, and the link of the parent session, which the chat shows as a
 * session chip. The agent reads the parent with `read_session` when it
 * needs more.
 */
export function sideFirstMessage(side: SideQuestion): string {
  const parent = sessionLink(autocompleteSessions.autocomplete)
  return [side.prompt, '', `> ${side.quote}`, '', `Quoted from ${parent}`].join(
    '\n',
  )
}

const first: ChatItem = {
  kind: 'user',
  id: 'side-first',
  text: sideFirstMessage(sideQuestions.count),
}

const plan = agent(
  'side-plan',
  "I'll count them on the read-only replica of the production database.",
)

/**
 * The chat of the side session of `count` in each run state. It runs just
 * after the send, then waits for a member to allow its run with the
 * secret of the replica, then answers. A closed side session keeps the
 * chat of its answer.
 */
export const countChats = {
  running: [first, plan, working('6s')],
  waiting: [
    first,
    plan,
    call(replicaRequest, 'running'),
    run(replicaRequest, 'waiting'),
    working('24s'),
  ],
  idle: [
    first,
    plan,
    call(replicaRequest, 'done'),
    run(replicaRequest, 'allowed', { grant: allowedByCal }),
    counted,
    { kind: 'turn-end', id: 'side-end', duration: '1m 12s', files: [] },
  ],
} as const satisfies Record<string, readonly ChatItem[]>

/** The keys of the chats of side sessions, for the workspace state. */
export const sideQuestionConversationKeys = ['side-question'] as const

/**
 * The chat of the side session of `count` after its answer, which shows
 * when its tab shows.
 */
export const sideQuestionConversations = {
  'side-question': countChats.idle,
} as const satisfies Record<
  (typeof sideQuestionConversationKeys)[number],
  readonly ChatItem[]
>
