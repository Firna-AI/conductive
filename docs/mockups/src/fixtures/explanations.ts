/**
 * The explanations of the chat of Address autocomplete, the first session
 * of Checkout address autocomplete. An explanation is a normal session with
 * an anchor: the parent session, the message, and the quoted text with the
 * text around it. Explain sends its first message at once: a prompt that
 * the app writes, whose first line gives the title of the session.
 */

import { sessionTitleFrom } from '../../../../src/shared/session-title'
import type { PersonKey } from './members'
import { autocompleteSessions, sessionLink } from './sessionLinks'

/**
 * The messages of the parent chat that explanations quote: the first
 * message of Cal, and the answer of the agent at the end of the turn.
 */
export type QuotedMessage = 'ask' | 'done'

export type Explanation = {
  /** The key of the explanation, which its tab uses. */
  key: string
  /** The message of the parent chat that holds the quote. */
  message: QuotedMessage
  /**
   * The quoted text as the fixture of the message writes it, with its
   * code marks. The anchor stores the rendered text of the selection.
   */
  quote: string
  /** The rendered text of the quote, as the popover and the title show it. */
  text: string
  /** The title of the explanation, from the first line of its prompt. */
  title: string | null
  /** The member who pressed Explain, who started the session. */
  starter: PersonKey
}

/** The first line of the written prompt, which names the quoted text. */
function explainLine(text: string): string {
  return `Explain "${text}"`
}

function explanation(
  key: string,
  message: QuotedMessage,
  quote: string,
  starter: PersonKey,
): Explanation {
  const text = quote.replaceAll('`', '')
  const title = sessionTitleFrom(explainLine(text))
  return { key, message, quote, text, title, starter }
}

/**
 * The explanations that the mockups draw. Cal explains `count`, a line of
 * the answer, which the flow follows. `lookup`, `proxy`, and `tests` are
 * explanations of Cal and Priya in other states, and `match` lies inside
 * the quote of `count`, so their marks overlap.
 */
export const explanations = {
  count: explanation(
    'explain-count',
    'done',
    'Manual entry still works when there is no match.',
    'cal',
  ),
  lookup: explanation(
    'explain-lookup',
    'done',
    'Removed the old postcode lookup',
    'cal',
  ),
  proxy: explanation(
    'explain-proxy',
    'ask',
    'Use the places proxy at `/api/places`',
    'priya',
  ),
  tests: explanation(
    'explain-tests',
    'done',
    'checkout end-to-end tests',
    'priya',
  ),
  match: explanation(
    'explain-match',
    'done',
    'when there is no match',
    'priya',
  ),
} as const satisfies Record<string, Explanation>

/** The text that Cal selects in his own first message of the parent chat. */
export const selectedInMessage = 'keep the manual fields as a fallback'

/** The ID of the answer that `count` quotes, as its anchor stores it. */
const answerId = 'msg_01K9T3ZC4M8Q2X7HV5N6RD'

/** The rendered lines of the answer around the quote of `count`. */
const countContext = [
  'Choosing a suggestion fills the street, city, and postcode.',
  'Manual entry still works when there is no match.',
  'Removed the old postcode lookup, which the suggestions replace.',
]

/**
 * The first message of the explanation of `count`, which the app writes
 * and sends at once. Its first line names the quote, so it gives the title
 * of the session. Then come the title of the parent session with its link,
 * which the chat shows as a session chip, the message ID, and the quote
 * with the lines around it, each on its own line. Last, the instruction:
 * read the parent with `read_session` when the quote needs more, change no
 * files, and keep the answer short for the popover. The popover hides this
 * message, and the tab shows it.
 */
export function writtenPrompt(): string {
  const parent = autocompleteSessions.autocomplete
  return [
    explainLine(explanations.count.text),
    '',
    `Session: ${sessionLink(parent)}`,
    `Message: ${answerId}`,
    'The text with the lines around it:',
    ...countContext.map((line) => `> ${line}`),
    '',
    'Read that session with `read_session` if you need more context. Change no files. Keep the answer short, because it shows in a small popover.',
  ].join('\n')
}
