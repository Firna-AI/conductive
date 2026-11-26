import type { TableCells } from '../../markdown/table-rows'
import type { Token } from '../code/highlight'

/** The six heading levels of Markdown. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

/** Inline content of a block. A link holds a checked, safe address. */
export type MdInline =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong' | 'emphasis' | 'strike'; children: MdInline[] }
  | { kind: 'link'; href: string; children: MdInline[] }
  | { kind: 'break' }

/**
 * One block of a Markdown file, with its parsed inline content. A code
 * block keeps its fence label, and `lines` holds the coloured tokens of
 * each line of its text when the label names a language, or null for
 * plain text.
 */
export type MdBlock =
  | { kind: 'heading'; level: HeadingLevel; text: MdInline[] }
  | { kind: 'paragraph'; text: MdInline[] }
  | {
      kind: 'code'
      text: string
      label: string | null
      lines: Token[][] | null
    }
  | { kind: 'quote'; blocks: MdBlock[] }
  | { kind: 'list'; ordered: boolean; start: number; items: MdListItem[] }
  | { kind: 'rule' }
  | ({ kind: 'table' } & TableCells<MdInline[]>)
  /** The rest of the file as typed, after a row passed the table budget. */
  | { kind: 'literal'; text: string }

/** An item of a list: its task box, and its blocks. */
export interface MdListItem {
  /** A task item is done or not done. Null for other items. */
  checked: boolean | null
  blocks: MdBlock[]
}

/**
 * A parsed Markdown file. Each block holds its parsed inline content. The
 * worker posts it to the page, so it holds plain data only.
 */
export interface MarkdownDocument {
  blocks: MdBlock[]
}

/**
 * A whole parse on the calling thread, for a render that cannot wait for
 * the worker, such as a static render.
 */
export type MarkdownParser = (source: string) => MarkdownDocument
