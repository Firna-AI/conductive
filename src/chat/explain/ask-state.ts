import type { ExplainSessionRequest } from '../../shared/sessions'
import type { ExplainSelection } from './selection'

/**
 * The selection that a press on Ask saved: the message, the quote, the text
 * around it, and a copy of the range of the quote. The focus then moves into
 * the field of the popover, which ends the selection of the page. So the
 * unsent popover, its highlight, and Send use this copy, never the
 * selection of the page.
 */
export interface KeptQuote {
  messageId: string
  quote: string
  before: string
  after: string
  range: Range
}

/**
 * An Ask before its explanation starts. `text` is the text of its field.
 * `question` is the question whose start waits for its reply, or null before
 * Send and after a failed start. Its popover shows while `open`.
 */
export interface UnsentAsk {
  /** The session whose chat holds the quote. */
  parentId: string
  kept: KeptQuote
  text: string
  question: string | null
  open: boolean
}

/** The Ask of a press on Ask: the saved selection and an empty field. */
export function pressedAsk(
  selection: ExplainSelection,
  parentId: string,
): UnsentAsk {
  const { messageId, quote, before, after, range } = selection
  return {
    parentId,
    kept: { messageId, quote, before, after, range: range.cloneRange() },
    text: '',
    question: null,
    open: true,
  }
}

/** The field holds a question, and no start waits. White space is no text. */
export function canSend(ask: UnsentAsk): boolean {
  return ask.question === null && ask.text.trim() !== ''
}

/** The Ask at Send: the field empties, and its text waits as the question. */
export function sentAsk(ask: UnsentAsk): UnsentAsk {
  return { ...ask, text: '', question: ask.text }
}

/** The request that starts the explanation of an Ask with its question. */
export function askRequest(
  kept: KeptQuote,
  question: string,
): ExplainSessionRequest {
  const { messageId, quote, before, after } = kept
  return { messageId, quote, before, after, question }
}

/**
 * The Ask after a failed start: its popover opens again, and the question
 * goes back into the field, before the text typed during the wait, as a
 * refused message goes back into the composer.
 */
export function failedAsk(ask: UnsentAsk): UnsentAsk {
  const parts = [ask.question ?? '', ask.text].filter((part) => part !== '')
  return { ...ask, text: parts.join('\n'), question: null, open: true }
}

/**
 * The Ask after a close of its popover. Before Send, the Ask goes with its
 * text, and nothing starts. While its start waits, the request has gone, so
 * the start goes on, and only the popover closes.
 */
export function closedAsk(ask: UnsentAsk): UnsentAsk | null {
  return ask.question === null ? null : { ...ask, open: false }
}
