import type { ExplainSessionRequest } from '../../shared/sessions'
import type { ChatSnapshot } from '../state/chat-snapshot'
import { sessionShowing } from '../state/late-sends'
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
 * A start of an Ask: its question, and the ID of its written prompt, which
 * the app chooses. It waits for its reply while `waits`. After a failure
 * with no answer or a server error, it waits no longer, but it can still
 * have reached the Worker.
 */
export interface AskStart {
  promptId: string
  question: string
  waits: boolean
}

/**
 * An Ask before its explanation starts. `text` is the text of its field.
 * `start` is the start whose outcome the chat does not know, as `AskStart`
 * says, or null before Send and after a refused start. Its popover shows
 * while `open`.
 */
export interface UnsentAsk {
  /** The session whose chat holds the quote. */
  parentId: string
  kept: KeptQuote
  text: string
  start: AskStart | null
  open: boolean
}

/** The unsent Asks of the chat, at most one for each parent session. */
export type Asks = ReadonlyMap<string, UnsentAsk>

export const noAsks: Asks = new Map()

/** The Asks after a change of the Ask of one parent session. Null removes it. */
export function withAsk(
  asks: Asks,
  parentId: string,
  change: (ask: UnsentAsk | null) => UnsentAsk | null,
): Asks {
  const current = asks.get(parentId) ?? null
  const next = change(current)
  if (next === current) return asks
  const changed = new Map(asks)
  if (next) changed.set(parentId, next)
  else changed.delete(parentId)
  return changed
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
    start: null,
    open: true,
  }
}

/** The field holds a question, and no start waits. White space is no text. */
export function canSend(ask: UnsentAsk): boolean {
  return ask.start?.waits !== true && ask.text.trim() !== ''
}

/**
 * The start of a Send of the text of the field. A Send of the question of a
 * start that can still have reached the Worker is that start again, so it
 * keeps its prompt ID: the Worker then gives the explanation that it
 * started, and no second one starts. Any other question takes a new ID.
 */
export function nextStart(ask: UnsentAsk, newId: () => string): AskStart {
  const question = ask.text
  const last = ask.start
  const again = last !== null && last.question.trim() === question.trim()
  return { promptId: again ? last.promptId : newId(), question, waits: true }
}

/** The Ask at Send: the field empties, and its question waits in `start`. */
export function sentAsk(ask: UnsentAsk, start: AskStart): UnsentAsk {
  return { ...ask, text: '', start }
}

/** The request that starts the explanation of an Ask with its question. */
export function askRequest(
  kept: KeptQuote,
  start: AskStart,
): ExplainSessionRequest {
  const { messageId, quote, before, after } = kept
  const { question, promptId } = start
  return { messageId, quote, before, after, question, promptId }
}

/**
 * The Ask after a failed start: its popover opens again, and the question
 * goes back into the field, before the text typed during the wait, as a
 * refused message goes back into the composer. A refused start goes. Any
 * other failed start stays, because it can still have reached the Worker.
 */
export function failedAsk(ask: UnsentAsk, refused: boolean): UnsentAsk {
  const parts = [ask.start?.question ?? '', ask.text].filter(
    (part) => part !== '',
  )
  const start = ask.start && !refused ? { ...ask.start, waits: false } : null
  return { ...ask, text: parts.join('\n'), start, open: true }
}

/**
 * The Ask after a close of its popover. Before Send, the Ask goes with its
 * text, and nothing starts. While its start waits, the request has gone, so
 * the start goes on, and only the popover closes.
 */
export function closedAsk(ask: UnsentAsk): UnsentAsk | null {
  return ask.start?.waits === true ? { ...ask, open: false } : null
}

/**
 * The text of the field that goes into the draft of the explanation when
 * the start of an Ask shows: the text that the member typed while the start
 * waited. After a failure, the question went back into the field before
 * that text, so the question goes now, while the field still starts with
 * it. A field that no longer starts with it keeps all of its text.
 */
export function movedText(ask: UnsentAsk): string {
  const start = ask.start
  if (!start || start.waits) return ask.text
  if (ask.text === start.question) return ''
  const before = `${start.question}\n`
  return ask.text.startsWith(before) ? ask.text.slice(before.length) : ask.text
}

/** The start of an Ask whose written prompt a transcript shows. */
export interface ShownStart {
  parentId: string
  promptId: string
  /** The session of the new explanation, whose transcript shows the prompt. */
  sessionId: string
}

const noneShown: readonly ShownStart[] = []

/**
 * The starts of the Asks whose written prompts a transcript shows, by their
 * IDs: starts that wait, and starts that failed with no answer or a server
 * error. Each of them started its explanation.
 */
export function shownStarts(
  snapshot: ChatSnapshot,
  asks: Asks,
): readonly ShownStart[] {
  const shown: ShownStart[] = []
  for (const { parentId, start } of asks.values()) {
    if (!start) continue
    const sessionId = sessionShowing(snapshot, start.promptId)
    if (sessionId) shown.push({ parentId, promptId: start.promptId, sessionId })
  }
  return shown.length > 0 ? shown : noneShown
}
