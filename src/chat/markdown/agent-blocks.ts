import { fenceLabel } from '../../markdown/fence-label'
import { maxDepth, parseMarkdownTokens } from '../../markdown/parser'
import { readTaskBox, type ListItem } from '../../markdown/task-boxes'
import { closeOf, containerLines, tokenRead } from '../../markdown/token-read'
import { showsInline } from './agent-breaks'
import type { InlineText } from './agent-inline'
import { heading, paragraph, textOf, type AgentRead } from './agent-paragraphs'
import { linesText } from './agent-source'
import { readTable, type TextTable } from './agent-tables'
import { liveEnd } from './live-end'

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
  | { kind: 'code'; text: string; label: string | null }
  | { kind: 'quote'; blocks: readonly TextBlock[] }
  | { kind: 'rule' }
  | TextTable

/** A list of an agent message. */
export type TextList = Extract<TextBlock, { kind: 'ul' | 'ol' }>

/**
 * A list item of an agent message: its task box, and the blocks of the
 * lines indented under its marker.
 */
export type TextItem = ListItem<TextBlock>

/**
 * A list or a quote past the depth limit, as the text of a paragraph: its
 * source lines, with their marks.
 */
function deepText(read: AgentRead, quotes: number): TextBlock[] {
  return paragraph(linesText(containerLines(read), quotes))
}

/**
 * A list item with its task box, which `readTaskBox` reads at the start of
 * its first paragraph, as the file preview does. `content` is the source
 * text of that paragraph, or undefined when the item starts with another
 * block. The box leaves the text with the space after it, and a paragraph
 * that then shows nothing leaves the item.
 */
function taskItem(content: string | undefined, blocks: TextBlock[]): TextItem {
  const [first, ...rest] = blocks
  const box =
    content !== undefined && first?.kind === 'p'
      ? readTaskBox(content, first.text)
      : null
  if (box === null) return { checked: null, blocks }
  const text = showsInline(box.nodes) ? box.nodes : []
  return { checked: box.checked, blocks: [...paragraph(text), ...rest] }
}

/**
 * A bulleted or a numbered list, with the blocks and the task box of each
 * item, as "Lists" of `chat-markdown.md` says.
 */
function list(read: AgentRead, depth: number, quotes: number): TextBlock[] {
  const open = read.tokens[read.index]
  const close = closeOf(read.tokens, read.index)
  const items: TextItem[] = []
  read.index += 1
  while (read.index < close) {
    const token = read.tokens[read.index]
    read.index += 1
    if (token.type !== 'list_item_open') continue
    const first = read.tokens[read.index]
    const content =
      first?.type === 'paragraph_open'
        ? read.tokens[read.index + 1]?.content
        : undefined
    const blocks = blocksUntil(read, 'list_item_close', depth + 1, quotes)
    items.push(taskItem(content, blocks))
  }
  read.index = close + 1
  if (open.type !== 'ordered_list_open') return [{ kind: 'ul', items }]
  return [{ kind: 'ol', start: Number(open.attrGet('start') ?? 1), items }]
}

/** The block at the index of the read, and the index after it. */
function block(read: AgentRead, depth: number, quotes: number): TextBlock[] {
  const token = read.tokens[read.index]
  switch (token.type) {
    case 'paragraph_open': {
      const text = textOf(read, read.tokens[read.index + 1])
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
      return [
        {
          kind: 'code',
          text: token.content.replace(/\n$/u, ''),
          label: token.type === 'fence' ? fenceLabel(token.info) : null,
        },
      ]
    case 'table_open': {
      const { tokens, lines } = read
      const { table, next } = readTable(tokens, read.index, lines, quotes, read)
      read.index = next
      return [table]
    }
    default:
      read.index += 1
      return token.type === 'inline' ? paragraph(textOf(read, token)) : []
  }
}

/**
 * The blocks from the index of the read up to the token of type `close`,
 * which the read then passes. `depth` counts the lists and the quotes
 * around the blocks, and `quotes` the quotes alone.
 */
function blocksUntil(
  read: AgentRead,
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
 * own cells, lists and quotes nest at most 16 deep, with deeper source
 * kept as paragraph text, and a list item can start with a task box.
 *
 * `live` reads a message that the agent still writes: each open mark of
 * the paragraph, the heading, or the table cell where its text ends closes
 * at the end of the text, as "While the agent writes" says. A finished
 * message, also from the saved history, reads each mark as CommonMark does.
 */
export function agentBlocks(text: string, live = false): TextBlock[] {
  const parsed = parseMarkdownTokens(text, { chat: true })
  const read: AgentRead = {
    ...tokenRead(parsed),
    live: live ? liveEnd(parsed.tokens, parsed.lines) : null,
    references: parsed.references,
  }
  return blocksUntil(read, null, 0, 0)
}
