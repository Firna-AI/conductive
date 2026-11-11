import {
  atxHeading,
  setextLevel,
  type HeadingLevel,
} from '../../markdown/headings'
import { expandTabs, indentOf, isBlank, isRule } from '../../markdown/lines'
import {
  interruptsParagraph,
  listMarker,
  maxNesting,
  readList,
  type ItemBlocks,
  type ListItem,
} from '../../markdown/list-items'
import { tableStarts, type TableCells } from '../../markdown/table-rows'
import { closesFence, openingFence } from './markdown-lines'
import { parseTable, TableBudget } from './markdown-tables'
import { takeDefinitions } from './markdown-text'

/**
 * One block of a Markdown file. `Inline` is the inline text of a block:
 * the raw text as the block parser reads it, or the parsed inline content
 * of the document.
 */
export type MdBlock<Inline = string> =
  | { kind: 'heading'; level: HeadingLevel; text: Inline }
  | { kind: 'paragraph'; text: Inline }
  | { kind: 'code'; text: string }
  | { kind: 'quote'; blocks: MdBlock<Inline>[] }
  | {
      kind: 'list'
      ordered: boolean
      start: number
      items: MdListItem<Inline>[]
    }
  | { kind: 'rule' }
  | ({ kind: 'table' } & TableCells<Inline>)
  /** The rest of the file as typed, after a row passed the table budget. */
  | { kind: 'literal'; text: string }

/** An item of a list: its task box, and its blocks. */
export type MdListItem<Inline = string> = ListItem<MdBlock<Inline>>

/** The blocks of a file with raw inline text, before the inline parse. */
export interface MarkdownBlocks {
  blocks: MdBlock[]
  /** Link reference definitions, by their normalized label. */
  definitions: ReadonlyMap<string, string>
}

const quoteLine = /^ {0,3}> ?/

/** A line that ends a paragraph, because it starts another block. */
function startsBlock(line: string): boolean {
  if (openingFence(line) || atxHeading(line)) return true
  if (isRule(line) || quoteLine.test(line)) return true
  const marker = listMarker(line)
  return marker !== null && interruptsParagraph(marker)
}

/** A text without unindented lines of a list item. */
const noLazyLines: ReadonlySet<number> = new Set()

class BlockParser {
  readonly definitions = new Map<string, string>()
  private depth = 0
  /** The empty table cells of the file, shared by quotes and lists. */
  private readonly tables = new TableBudget()
  /** The line of the file where the lines of the current parse start. */
  private origin = 0
  private tailLine: number | null = null
  /**
   * The unindented lines of the list item that the parse reads. Only a
   * paragraph continues them, so a block before one of them ends there.
   */
  private lazy: ReadonlySet<number> = noLazyLines

  /**
   * The line of the file where the text tail starts, or null. A row that
   * passes the table budget starts it, and the parse stops there.
   */
  get tail(): number | null {
    return this.tailLine
  }

  /**
   * Parses the content of a quote or a list item, one level deeper. Each
   * line of the content comes from one line of the parent, from `start`.
   * The parse stops at the first line in `lazy` that continues no
   * paragraph, and `end` is the number of lines that it read.
   */
  nested = (
    lines: readonly string[],
    start: number,
    lazy: ReadonlySet<number> = noLazyLines,
  ): ItemBlocks<MdBlock> => {
    if (this.tailLine !== null) return { blocks: [], end: lines.length }
    // Quotes and lists nest at most this deep. Deeper content shows as text.
    if (this.depth + 1 >= maxNesting) {
      const text = lines.join('\n').trim()
      return { blocks: [{ kind: 'paragraph', text }], end: lines.length }
    }
    const origin = this.origin
    const outerLazy = this.lazy
    this.depth += 1
    this.origin = origin + start
    this.lazy = lazy
    try {
      return this.read(lines)
    } finally {
      this.depth -= 1
      this.origin = origin
      this.lazy = outerLazy
    }
  }

  parse = (lines: readonly string[]): MdBlock[] => this.read(lines).blocks

  private read(lines: readonly string[]): ItemBlocks<MdBlock> {
    const blocks: MdBlock[] = []
    let index = 0
    while (index < lines.length && this.tailLine === null) {
      // A paragraph reads its own lazy lines, so this one ends the item.
      if (this.lazy.has(index)) return { blocks, end: index }
      const line = lines[index]
      if (isBlank(line)) {
        index += 1
        continue
      }
      index = this.block(lines, index, blocks)
    }
    return { blocks, end: lines.length }
  }

  /** Reads the block at `index` into `blocks`. Returns the next index. */
  private block(lines: readonly string[], index: number, blocks: MdBlock[]) {
    const line = lines[index]
    if (indentOf(line) >= 4) return this.indentedCode(lines, index, blocks)
    const fence = openingFence(line)
    if (fence) {
      const code: string[] = []
      let next = index + 1
      while (next < lines.length && !closesFence(lines[next], fence.marker)) {
        if (this.lazy.has(next)) break
        const text = lines[next]
        code.push(text.slice(Math.min(fence.indent, indentOf(text))))
        next += 1
      }
      blocks.push({ kind: 'code', text: code.join('\n') })
      return this.lazy.has(next) ? next : next + 1
    }
    const heading = atxHeading(line)
    if (heading) {
      blocks.push({ kind: 'heading', ...heading })
      return index + 1
    }
    if (isRule(line)) {
      blocks.push({ kind: 'rule' })
      return index + 1
    }
    if (quoteLine.test(line)) return this.quote(lines, index, blocks)
    const marker = listMarker(line)
    if (marker) {
      let kept = 0
      const { list, next } = readList<MdBlock>(lines, index, marker, {
        startsBlock: (all, at) => startsBlock(all[at]),
        parseItem: (item, at, lazy) => {
          if (this.tailLine === null) kept += 1
          return this.nested(item, at, lazy)
        },
        tasks: true,
      })
      // The items after the start of the tail are in the tail.
      list.items.splice(kept)
      blocks.push({ kind: 'list', ...list })
      return next
    }
    if (tableStarts(lines, index)) {
      const ends = (at: number) => this.lazy.has(at)
      const table = parseTable(lines, index, this.tables, ends)
      blocks.push(table.block)
      if (!this.tables.open) this.tailLine = this.origin + table.next
      return table.next
    }
    return this.paragraph(lines, index, blocks)
  }

  private indentedCode(
    lines: readonly string[],
    index: number,
    blocks: MdBlock[],
  ) {
    const code: string[] = []
    let next = index
    for (; next < lines.length; next += 1) {
      const text = lines[next]
      if (!isBlank(text) && indentOf(text) < 4) break
      code.push(text.slice(Math.min(4, text.length)))
    }
    while (code.length > 0 && isBlank(code[code.length - 1])) code.pop()
    blocks.push({ kind: 'code', text: code.join('\n') })
    return next
  }

  private quote(lines: readonly string[], index: number, blocks: MdBlock[]) {
    const inner: string[] = []
    let next = index
    for (; next < lines.length; next += 1) {
      const text = lines[next]
      if (quoteLine.test(text)) inner.push(text.replace(quoteLine, ''))
      else if (!isBlank(text) && !startsBlock(text) && inner.length > 0) {
        inner.push(text)
      } else break
    }
    const quote = this.nested(inner, index)
    blocks.push({ kind: 'quote', blocks: quote.blocks })
    return next
  }

  private paragraph(
    lines: readonly string[],
    index: number,
    blocks: MdBlock[],
  ) {
    const text = [lines[index].trimStart()]
    let next = index + 1
    for (; next < lines.length && !isBlank(lines[next]); next += 1) {
      const line = lines[next]
      const level = this.lazy.has(next) ? null : setextLevel(line)
      if (level !== null) {
        const rest = takeDefinitions(text, this.definitions)
        if (rest.length === 0) break
        blocks.push({ kind: 'heading', level, text: rest.join('\n').trim() })
        return next + 1
      }
      if (startsBlock(line)) break
      text.push(line.trimStart())
    }
    const rest = takeDefinitions(text, this.definitions)
    if (rest.length > 0) {
      blocks.push({ kind: 'paragraph', text: rest.join('\n').trimEnd() })
    }
    return next
  }
}

/**
 * Parses Markdown into blocks, and collects the link reference
 * definitions of the whole file. The parser never runs or keeps HTML.
 * After a row that passes the table budget, the rest of the file is one
 * literal block, as typed.
 */
export function parseBlocks(source: string): MarkdownBlocks {
  const lines = source.split(/\r\n|\n|\r/)
  const parser = new BlockParser()
  const blocks = parser.parse(lines.map(expandTabs))
  if (parser.tail !== null) {
    const text = lines.slice(parser.tail).join('\n').trimEnd()
    blocks.push({ kind: 'literal', text })
  }
  return { blocks, definitions: parser.definitions }
}
