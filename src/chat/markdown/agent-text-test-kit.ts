import type { CellAlign } from '../../markdown/table-rows'
import {
  agentBlocks,
  type HeadingLevel,
  type TextBlock,
  type TextItem,
} from './agent-blocks'
import type { InlineMark, InlineText } from './agent-inline'

// The helpers of the tests of the chat adapter: blocks and inline text in a
// short form that a test writes by hand.

/** The tag that the short form writes around the nodes of each mark. */
const markTags: Readonly<Record<InlineMark, string>> = {
  strong: 'b',
  emphasis: 'em',
  strike: 'del',
}

/**
 * Inline text in a short form: text as it is, code between backticks, a
 * mark as a tag around its text, such as `<b>bold</b>`, a line break as
 * `<br>`, a link as `{` and `}` around its typed text, and an image as
 * `{img alt -> address}`.
 */
function shortText(text: InlineText): string {
  return text
    .map((node) => {
      switch (node.kind) {
        case 'text':
          return node.text
        case 'code':
          return `\`${node.text}\``
        case 'break':
          return '<br>'
        case 'mark': {
          const tag = markTags[node.mark]
          return `<${tag}>${shortText(node.nodes)}</${tag}>`
        }
        case 'link':
          return `{${node.typed.open}${shortText(node.label)}${node.typed.close}}`
        case 'image':
          return `{img ${shortText(node.alt)} -> ${node.href}}`
      }
    })
    .join('')
}

/**
 * A block in a short form: each inline text as its `shortText`. A list item
 * is its blocks, and a task item also gives the state of its box.
 */
export type ShortBlock =
  | { kind: 'p'; text: string }
  | { kind: 'heading'; level: HeadingLevel; text: string }
  | { kind: 'ul'; items: ShortItem[] }
  | { kind: 'ol'; start: number; items: ShortItem[] }
  | Extract<TextBlock, { kind: 'code' }>
  | { kind: 'quote'; blocks: ShortBlock[] }
  | { kind: 'rule' }
  | { kind: 'table'; head: string[]; rows: string[][]; align: CellAlign[] }

/** A list item in the short form. */
type ShortItem = ShortBlock[] | { checked: boolean; blocks: ShortBlock[] }

/** A list item in its short form. */
function shortItem(item: TextItem): ShortItem {
  const blocks = shortBlocks(item.blocks)
  return item.checked === null ? blocks : { checked: item.checked, blocks }
}

/** The blocks in their short form. */
export function shortBlocks(blocks: readonly TextBlock[]): ShortBlock[] {
  return blocks.map((block): ShortBlock => {
    switch (block.kind) {
      case 'p':
      case 'heading':
        return { ...block, text: shortText(block.text) }
      case 'ul':
      case 'ol':
        return { ...block, items: block.items.map(shortItem) }
      case 'quote':
        return { kind: 'quote', blocks: shortBlocks(block.blocks) }
      case 'table':
        return {
          kind: 'table',
          head: block.head.map(shortText),
          rows: block.rows.map((row) => row.map(shortText)),
          align: [...block.align],
        }
      case 'code':
      case 'rule':
        return block
    }
  })
}

/** The blocks of an agent message of these lines, in their short form. */
export function blocksOf(...lines: string[]): ShortBlock[] {
  return shortBlocks(agentBlocks(lines.join('\n')))
}

/** A paragraph in the short form. */
export function p(text: string): ShortBlock {
  return { kind: 'p', text }
}

/** A heading in the short form. */
export function h(level: HeadingLevel, text: string): ShortBlock {
  return { kind: 'heading', level, text }
}

/** A table in the short form, with no alignment. */
export function table(head: string[], rows: string[][]): ShortBlock {
  return { kind: 'table', head, rows, align: head.map(() => null) }
}
