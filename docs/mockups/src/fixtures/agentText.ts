/**
 * The builders of the agent messages of the fixtures. A fixture writes the
 * blocks and the inline text of the app, `TextBlock` and `InlineText`, as
 * trees, so the mockups draw the data that the app draws. A string is a
 * text node with exactly its characters: no builder reads Markdown, so the
 * fixtures copy no bug of the reader of the app. Mentions, bare addresses,
 * and paths in code stay text and code, as in the app, where the text draws
 * them as chips and links.
 */

import type {
  HeadingLevel,
  TextBlock,
  TextItem,
  TextTable,
} from '../../../../src/chat/markdown/agent-blocks'
import type {
  InlineMark,
  InlineNode,
  InlineText,
} from '../../../../src/chat/markdown/agent-inline'
import type { CellAlign } from '../../../../src/markdown/table-rows'

/** A part of inline text: a string for a text node, or a node. */
export type Inline = string | InlineNode

/** The inline text of the parts, with each run of text as one text node. */
export function inline(...parts: readonly Inline[]): InlineText {
  const nodes: InlineNode[] = []
  for (const part of parts) {
    const node: InlineNode =
      typeof part === 'string' ? { kind: 'text', text: part } : part
    const last = nodes.at(-1)
    if (node.kind === 'text' && node.text === '') continue
    if (node.kind === 'text' && last?.kind === 'text') {
      nodes[nodes.length - 1] = { kind: 'text', text: last.text + node.text }
    } else nodes.push(node)
  }
  return nodes
}

/** Inline code, such as `` `npm test` ``. */
export function code(text: string): InlineNode {
  return { kind: 'code', text }
}

function mark(kind: InlineMark, parts: readonly Inline[]): InlineNode {
  return { kind: 'mark', mark: kind, nodes: inline(...parts) }
}

/** Bold text, such as `**Next:**`. */
export function strong(...parts: Inline[]): InlineNode {
  return mark('strong', parts)
}

/** Emphasis, such as `*stops*`. */
export function emphasis(...parts: Inline[]): InlineNode {
  return mark('emphasis', parts)
}

/** Strikethrough, such as `~~Hide the fields~~`. */
export function strike(...parts: Inline[]): InlineNode {
  return mark('strike', parts)
}

/** A line break, such as `<br>`. */
export const lineBreak: InlineNode = { kind: 'break' }

/** A Markdown link with its label, such as `[W-402](https://…)`. */
export function link(href: string, ...label: Inline[]): InlineNode {
  return {
    kind: 'link',
    href,
    label: inline(...label),
    typed: { open: '[', close: `](${href})` },
  }
}

/** A Markdown image with its alt text, such as `![Shot](shots/after.png)`. */
export function image(alt: string, href: string): InlineNode {
  return {
    kind: 'image',
    href,
    alt: inline(alt),
    source: `![${alt}](${href})`,
  }
}

/** A paragraph. */
export function p(...parts: Inline[]): TextBlock {
  return { kind: 'p', text: inline(...parts) }
}

/** A heading at the level that the agent wrote, such as `##` for 2. */
export function heading(level: HeadingLevel, ...parts: Inline[]): TextBlock {
  return { kind: 'heading', level, text: inline(...parts) }
}

/** A list item of one paragraph. */
export function item(...parts: Inline[]): TextItem {
  return { checked: null, blocks: [p(...parts)] }
}

/** A task item of one paragraph, such as `- [ ]`, or `- [x]` when done. */
export function task(done: boolean, ...parts: Inline[]): TextItem {
  return { checked: done, blocks: [p(...parts)] }
}

/** The item with the blocks that the agent indents under its text. */
export function under(head: TextItem, ...blocks: TextBlock[]): TextItem {
  return { checked: head.checked, blocks: [...head.blocks, ...blocks] }
}

/** A bulleted list. */
export function bullets(...items: TextItem[]): TextBlock {
  return { kind: 'ul', items }
}

/** A numbered list, from 1. */
export function numbered(...items: TextItem[]): TextBlock {
  return { kind: 'ol', start: 1, items }
}

/** A quote of the blocks, such as `> text`. */
export function quote(...blocks: TextBlock[]): TextBlock {
  return { kind: 'quote', blocks }
}

/** A rule, such as `---`. */
export const rule: TextBlock = { kind: 'rule' }

/** A code block, with its text as the agent wrote it. */
export function codeBlock(text: string): TextBlock {
  return { kind: 'code', text, label: null }
}

/** A cell of a table: one part, or the parts of its inline text. */
type Cell = Inline | readonly Inline[]

function cellText(cell: Cell): InlineText {
  return typeof cell === 'string' || 'kind' in cell
    ? inline(cell)
    : inline(...cell)
}

/**
 * A table: the alignment of each column, the header row, and the body
 * rows. A short row keeps only its own cells.
 */
export function table(
  align: readonly CellAlign[],
  head: readonly Cell[],
  rows: readonly (readonly Cell[])[],
): TextTable {
  return {
    kind: 'table',
    align,
    head: head.map(cellText),
    rows: rows.map((row) => row.map(cellText)),
  }
}
