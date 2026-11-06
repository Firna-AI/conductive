import { parseBlocks, type MdBlock } from './markdown-blocks'
import { parseInline, type MdInline } from './markdown-inline'

type Definitions = ReadonlyMap<string, string>

/** A parsed Markdown file. Each block holds its parsed inline content. */
export interface MarkdownDocument {
  blocks: MdBlock<MdInline[]>[]
}

/**
 * A whole parse on the calling thread, for a render that cannot wait for
 * the worker, such as a static render.
 */
export type MarkdownParser = (source: string) => MarkdownDocument

function inlineBlocks(
  blocks: readonly MdBlock[],
  definitions: Definitions,
): MdBlock<MdInline[]>[] {
  return blocks.map((block) => inlineBlock(block, definitions))
}

function inlineBlock(
  block: MdBlock,
  definitions: Definitions,
): MdBlock<MdInline[]> {
  const inline = (text: string) => parseInline(text, definitions)
  switch (block.kind) {
    case 'heading':
      return { kind: 'heading', level: block.level, text: inline(block.text) }
    case 'paragraph':
      return { kind: 'paragraph', text: inline(block.text) }
    case 'code':
    case 'rule':
      return block
    case 'quote':
      return { kind: 'quote', blocks: inlineBlocks(block.blocks, definitions) }
    case 'list':
      return {
        kind: 'list',
        ordered: block.ordered,
        start: block.start,
        items: block.items.map((item) => ({
          checked: item.checked,
          blocks: inlineBlocks(item.blocks, definitions),
        })),
      }
    case 'table':
      return {
        kind: 'table',
        align: block.align,
        head: block.head.map(inline),
        rows: block.rows.map((row) => row.map(inline)),
      }
  }
}

/**
 * Parses a Markdown file: its blocks, then the inline content of each
 * block, with the link reference definitions of the whole file. The
 * Markdown worker runs this parse. The parser never runs or keeps HTML.
 */
export function parseMarkdown(source: string): MarkdownDocument {
  const { blocks, definitions } = parseBlocks(source)
  return { blocks: inlineBlocks(blocks, definitions) }
}
