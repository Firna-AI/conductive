import { maxDepth, parseMarkdownTokens } from '../../markdown/parser'
import {
  closeOf,
  containerLines,
  tokenRead,
  unquoted,
  type TokenRead,
} from '../../markdown/token-read'
import { inlineText, type InlineText } from './agent-inline'
import { linesText } from './agent-source'
import { readTable, type TextTable } from './agent-tables'

export type { TextTable }

/** The level of a heading, from `h1` to `h6`. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

/**
 * A block of an agent message, from the Markdown that the agent writes. A
 * paragraph, a heading, and a table cell hold inline text. A heading keeps
 * the level that the agent wrote. A numbered list counts up from `start`,
 * the number of its first item. A quote holds its own blocks. Each block
 * draws something: a block that would draw nothing is left out.
 */
export type TextBlock =
  | { kind: 'p'; text: InlineText }
  | { kind: 'heading'; level: HeadingLevel; text: InlineText }
  | { kind: 'ul'; items: readonly TextItem[] }
  | { kind: 'ol'; start: number; items: readonly TextItem[] }
  | { kind: 'code'; text: string }
  | { kind: 'quote'; blocks: readonly TextBlock[] }
  | { kind: 'rule' }
  | TextTable

/** A list of an agent message. */
export type TextList = Extract<TextBlock, { kind: 'ul' | 'ol' }>

/** The blocks of one list item, from the lines indented under its marker. */
export type TextItem = readonly TextBlock[]

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
function paragraph(text: InlineText): TextBlock[] {
  return text.length > 0 ? [{ kind: 'p', text }] : []
}

/** The inline text with more text at its end. */
function withText(text: InlineText, more: string): InlineText {
  const last = text.at(-1)
  if (last?.kind !== 'text') return [...text, { kind: 'text', text: more }]
  return [...text.slice(0, -1), { kind: 'text', text: last.text + more }]
}

/**
 * A list or a quote past the depth limit, as the text of a paragraph: its
 * source lines, with their marks.
 */
function deepText(read: TokenRead, quotes: number): TextBlock[] {
  return paragraph(linesText(containerLines(read), quotes))
}

/**
 * A heading. An underline counts only when a line break follows it, so a
 * message that ends on an underline shows that line as text of the
 * paragraph above it. A heading with no text draws nothing.
 */
function heading(read: TokenRead, quotes: number): TextBlock[] {
  const open = read.tokens[read.index]
  const text = inlineText(read.tokens[read.index + 1].children)
  read.index += 3
  const underline = open.markup === '=' || open.markup === '-'
  const end = open.map?.[1] ?? 0
  if (underline && end >= read.lines.length) {
    const typed = unquoted(read.lines[end - 1] ?? '', quotes).trim()
    return paragraph(withText(text, ` ${typed}`))
  }
  const level = headingLevels.get(open.tag)
  if (text.length === 0 || level === undefined) return paragraph(text)
  return [{ kind: 'heading', level, text }]
}

/**
 * A bulleted or a numbered list, with the blocks of each item. The parser
 * reads no task box, so `[ ]` at the start of an item stays its text, as
 * "Lists" of `chat-markdown.md` says (open question, item 14 of the
 * Markdown parser plan).
 */
function list(read: TokenRead, depth: number, quotes: number): TextBlock[] {
  const open = read.tokens[read.index]
  const close = closeOf(read.tokens, read.index)
  const items: TextItem[] = []
  read.index += 1
  while (read.index < close) {
    const token = read.tokens[read.index]
    read.index += 1
    if (token.type === 'list_item_open') {
      items.push(blocksUntil(read, 'list_item_close', depth + 1, quotes))
    }
  }
  read.index = close + 1
  if (open.type !== 'ordered_list_open') return [{ kind: 'ul', items }]
  return [{ kind: 'ol', start: Number(open.attrGet('start') ?? 1), items }]
}

/** The block at the index of the read, and the index after it. */
function block(read: TokenRead, depth: number, quotes: number): TextBlock[] {
  const token = read.tokens[read.index]
  switch (token.type) {
    case 'paragraph_open': {
      const text = inlineText(read.tokens[read.index + 1].children)
      read.index += 3
      return paragraph(text)
    }
    case 'heading_open':
      return heading(read, quotes)
    case 'bullet_list_open':
    case 'ordered_list_open':
      if (depth >= maxDepth) return deepText(read, quotes)
      return list(read, depth, quotes)
    case 'blockquote_open': {
      if (depth >= maxDepth) return deepText(read, quotes)
      read.index += 1
      const blocks = blocksUntil(
        read,
        'blockquote_close',
        depth + 1,
        quotes + 1,
      )
      return blocks.length > 0 ? [{ kind: 'quote', blocks }] : []
    }
    case 'hr':
      read.index += 1
      return [{ kind: 'rule' }]
    case 'fence':
    case 'code_block':
      read.index += 1
      return [{ kind: 'code', text: token.content.replace(/\n$/u, '') }]
    case 'table_open': {
      const { table, rest, next } = readTable(
        read.tokens,
        read.index,
        read.lines,
        quotes,
      )
      read.index = next
      return [table, ...paragraph(linesText(rest, 0))]
    }
    default:
      read.index += 1
      return token.type === 'inline'
        ? paragraph(inlineText(token.children))
        : []
  }
}

/**
 * The blocks from the index of the read up to the token of type `close`,
 * which the read then passes. `depth` counts the lists and the quotes
 * around the blocks, and `quotes` the quotes alone.
 */
function blocksUntil(
  read: TokenRead,
  close: string | null,
  depth: number,
  quotes: number,
): TextBlock[] {
  const blocks: TextBlock[] = []
  while (read.index < read.tokens.length) {
    if (read.tokens[read.index].type === close) {
      read.index += 1
      return blocks
    }
    blocks.push(...block(read, depth, quotes))
  }
  return blocks
}

/**
 * The blocks of an agent message: paragraphs, headings, lists, code
 * blocks, quotes, rules, and tables, as the shared parser reads them by
 * the rules of CommonMark, with the tables and the strikethrough of GitHub.
 * The chat adds its own rules, as `chat-markdown.md` says: an underline
 * counts only when a line break follows it, a short table row keeps its
 * own cells, and lists and quotes nest at most 16 deep, with deeper source
 * kept as paragraph text. Each update of a live message reads the
 * whole text again, so it shows as the same message from the history.
 *
 * Open question, item 9 of the Markdown parser plan: while the agent
 * writes, a mark whose pair has not arrived shows as typed, because each
 * update reads as a finished message with the same text.
 */
export function agentBlocks(text: string): TextBlock[] {
  const read = tokenRead(parseMarkdownTokens(text, { chat: true }))
  return blocksUntil(read, null, 0, 0)
}
