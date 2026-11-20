import type { Env, Token } from 'markdown-it'
import { unquoted, type TokenRead } from '../../markdown/token-read'
import type { HeadingLevel, TextBlock } from './agent-blocks'
import { inlineText, type InlineText } from './agent-inline'
import { closedMarks } from './live-marks'
import { showsWords } from './readable-text'

/**
 * The paragraphs and the headings of an agent message, as the block read of
 * `agent-blocks.ts` reads them, with the text of the block where the text
 * of a live message ends.
 */

/** A read of the tokens of an agent message. */
export interface AgentRead extends TokenRead {
  /**
   * The inline token of the paragraph, the heading, or the table cell where
   * the text of a message that the agent still writes ends, whose open
   * marks close at its end. Null for a finished message.
   */
  readonly live: Token | null
  /** The reference definitions of the message, for the live block. */
  readonly references: Env['references']
}

/** The level of each heading element. */
const headingLevels: ReadonlyMap<string, HeadingLevel> = new Map<
  string,
  HeadingLevel
>([
  ['h1', 1],
  ['h2', 2],
  ['h3', 3],
  ['h4', 4],
  ['h5', 5],
  ['h6', 6],
])

/** A paragraph of the text, or nothing when the text draws nothing. */
export function paragraph(text: InlineText): TextBlock[] {
  return text.length > 0 ? [{ kind: 'p', text }] : []
}

/**
 * The inline text of an inline token. In the block where live text ends,
 * each open mark closes at the end of the text, as `closedMarks` says.
 */
export function textOf(read: AgentRead, inline: Token): InlineText {
  const children = inline.children ?? []
  const live =
    inline === read.live ? closedMarks(inline.content, read.references) : null
  return inlineText(live ?? children)
}

/** The inline text with more text at its end. */
function withText(text: InlineText, more: string): InlineText {
  const last = text.at(-1)
  if (last?.kind !== 'text') return [...text, { kind: 'text', text: more }]
  return [...text.slice(0, -1), { kind: 'text', text: last.text + more }]
}

/**
 * A heading at the index of the read. An underline counts only when a line
 * break follows it, so a message that ends on an underline shows that line
 * as text of the paragraph above it. In live text, the open marks of that
 * paragraph close after the underline, at the end of the text. A heading
 * that shows no words draws nothing, as `showsWords` says. It still ends
 * the paragraph above it.
 */
export function heading(read: AgentRead, quotes: number): TextBlock[] {
  const open = read.tokens[read.index]
  const inline = read.tokens[read.index + 1]
  read.index += 3
  const underline = open.markup === '=' || open.markup === '-'
  const end = open.map?.[1] ?? 0
  if (underline && end >= read.lines.length) {
    const typed = unquoted(read.lines[end - 1] ?? '', quotes).trim()
    const children = inline.children ?? []
    const live =
      inline === read.live
        ? closedMarks(`${inline.content}\n${typed}`, read.references)
        : null
    if (live) return paragraph(inlineText(live))
    return paragraph(withText(inlineText(children), ` ${typed}`))
  }
  const text = textOf(read, inline)
  const level = headingLevels.get(open.tag)
  if (level === undefined) return paragraph(text)
  return showsWords(text) ? [{ kind: 'heading', level, text }] : []
}
