import { fenceLabel } from '../../markdown/fence-label'
import { maxDepth, parseMarkdownTokens } from '../../markdown/parser'
import { readTaskBox } from '../../markdown/task-boxes'
import {
  closeOf,
  containerLines,
  linesInline,
  tokenRead,
  type TokenRead,
} from '../../markdown/token-read'
import type {
  HeadingLevel,
  MarkdownDocument,
  MdBlock,
  MdInline,
  MdListItem,
} from './markdown-document'
import { previewBreaks, previewInline } from './preview-inline'
import { maxAddedCells, previewTable, TableBudget } from './preview-tables'

/** A read of the tokens of one file, with its table budget and its tail. */
interface PreviewRead extends TokenRead {
  readonly budget: TableBudget
  /**
   * The index of the source line where the rest of the file shows as text,
   * or null. A row that passes the table budget sets it, and the read ends.
   */
  tail: number | null
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

/** A paragraph of the content, or nothing when the content draws nothing. */
function paragraph(text: MdInline[]): MdBlock[] {
  return text.length > 0 ? [{ kind: 'paragraph', text }] : []
}

/**
 * Source lines as the text of one paragraph, such as a list or a quote
 * past the depth limit, without the marks of the `quotes` quotes around.
 */
function linesParagraph(lines: readonly string[], quotes: number): MdBlock[] {
  return paragraph(previewInline(linesInline(lines, quotes)))
}

/**
 * A list item with its task box, which `readTaskBox` reads at the start of
 * its first paragraph. `content` is the source text of that paragraph, or
 * undefined when the item starts with another block. The box leaves the
 * text with the space after it, and a paragraph that then shows nothing
 * leaves the item.
 */
function taskItem(content: string | undefined, blocks: MdBlock[]): MdListItem {
  const [first, ...rest] = blocks
  const box =
    content !== undefined && first?.kind === 'paragraph'
      ? readTaskBox(content, first.text)
      : null
  if (box === null) return { checked: null, blocks }
  const text = previewBreaks(box.nodes)
  return { checked: box.checked, blocks: [...paragraph(text), ...rest] }
}

/**
 * A bulleted or a numbered list, with the blocks of each item. The items
 * after the start of the text tail are in the tail.
 */
function list(read: PreviewRead, depth: number, quotes: number): MdBlock[] {
  const open = read.tokens[read.index]
  const close = closeOf(read.tokens, read.index)
  const items: MdListItem[] = []
  read.index += 1
  while (read.index < close && read.tail === null) {
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
  const ordered = open.type === 'ordered_list_open'
  const start = Number(open.attrGet('start') ?? 1)
  return [{ kind: 'list', ordered, start, items }]
}

/** The block at the index of the read, and the index after it. */
function block(read: PreviewRead, depth: number, quotes: number): MdBlock[] {
  const token = read.tokens[read.index]
  switch (token.type) {
    case 'paragraph_open': {
      const text = previewInline(read.tokens[read.index + 1].children)
      read.index += 3
      return paragraph(text)
    }
    case 'heading_open': {
      const text = previewInline(read.tokens[read.index + 1].children)
      read.index += 3
      const level = headingLevels.get(token.tag)
      return level === undefined
        ? paragraph(text)
        : [{ kind: 'heading', level, text }]
    }
    case 'bullet_list_open':
    case 'ordered_list_open':
      if (depth >= maxDepth) return linesParagraph(containerLines(read), quotes)
      return list(read, depth, quotes)
    case 'blockquote_open': {
      if (depth >= maxDepth) return linesParagraph(containerLines(read), quotes)
      read.index += 1
      const inner = blocksUntil(read, 'blockquote_close', depth + 1, quotes + 1)
      return [{ kind: 'quote', blocks: inner }]
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
      const { tokens, lines, budget } = read
      const table = previewTable(tokens, read.index, lines, quotes, budget)
      read.index = table.next
      read.tail = table.tail
      return [table.block]
    }
    default:
      read.index += 1
      return token.type === 'inline'
        ? paragraph(previewInline(token.children))
        : []
  }
}

/**
 * The blocks from the index of the read up to the token of type `close`,
 * which the read then passes. `depth` counts the lists and the quotes
 * around the blocks, and `quotes` the quotes alone. The read ends where
 * the text tail starts.
 */
function blocksUntil(
  read: PreviewRead,
  close: string | null,
  depth: number,
  quotes: number,
): MdBlock[] {
  const blocks: MdBlock[] = []
  while (read.index < read.tokens.length && read.tail === null) {
    if (read.tokens[read.index].type === close) {
      read.index += 1
      return blocks
    }
    blocks.push(...block(read, depth, quotes))
  }
  return blocks
}

/**
 * The preview adapter of the shared parser: the blocks of a Markdown file
 * and their inline content, as the parser reads them by the rules of
 * CommonMark, with the tables and the strikethrough of GitHub. The preview
 * adds its own rules, as `workspace-tools.md` and the Files README say: a
 * task box at the start of a list item, lists and quotes at most 16 deep
 * with deeper source kept as text, and the table budget of the
 * file, after which the rest of the file shows as typed. The Markdown
 * worker runs this parse. No HTML of the file reaches the page.
 */
export function previewDocument(source: string): MarkdownDocument {
  const parsed = parseMarkdownTokens(source, { tableBudget: maxAddedCells })
  const read: PreviewRead = {
    ...tokenRead(parsed),
    budget: new TableBudget(),
    tail: null,
  }
  const blocks = blocksUntil(read, null, 0, 0)
  const tail = read.tail ?? parsed.tailLine
  if (tail !== null) {
    const text = parsed.lines.slice(tail).join('\n').trimEnd()
    blocks.push({ kind: 'literal', text })
  }
  return { blocks }
}
