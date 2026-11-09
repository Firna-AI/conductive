import { tableStarts, type TableCells } from '../../markdown/table-rows'
import {
  closesFence,
  expandTabs,
  indentOf,
  isBlank,
  isRule,
  openingFence,
} from './markdown-lines'
import { listMarker, parseList } from './markdown-lists'
import { parseTable, TableBudget } from './markdown-tables'
import { takeDefinitions } from './markdown-text'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

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

export interface MdListItem<Inline = string> {
  /** A task item is done or not done. Null for other items. */
  checked: boolean | null
  blocks: MdBlock<Inline>[]
}

/** The blocks of a file with raw inline text, before the inline parse. */
export interface MarkdownBlocks {
  blocks: MdBlock[]
  /** Link reference definitions, by their normalized label. */
  definitions: ReadonlyMap<string, string>
}

const headingLevels: readonly HeadingLevel[] = [1, 2, 3, 4, 5, 6]
const quoteLine = /^ {0,3}> ?/
const atxHeading = /^ {0,3}(#{1,6})(?:[ ]+|$)(.*)$/

/**
 * The text of an ATX heading without its closing `#` run: the trailing
 * spaces, the run, and the spaces before it. The run closes only after a
 * space or at the start. It gives the result of
 * `replace(/(?:^|[ ]+)#+[ ]*$/, '')` in one backward pass.
 */
function withoutClosingHashes(text: string): string {
  let end = text.length
  while (end > 0 && text[end - 1] === ' ') end -= 1
  let start = end
  while (start > 0 && text[start - 1] === '#') start -= 1
  if (start === end) return text
  if (start === 0) return ''
  if (text[start - 1] !== ' ') return text
  while (start > 0 && text[start - 1] === ' ') start -= 1
  return text.slice(0, start)
}

/** A line that ends a paragraph, because it starts another block. */
function startsBlock(line: string): boolean {
  if (openingFence(line) || atxHeading.test(line)) return true
  if (isRule(line) || quoteLine.test(line)) return true
  const marker = listMarker(line)
  if (!marker || marker.content.trim() === '') return false
  return !marker.ordered || marker.start === 1
}

/** Quotes and lists nest at most this deep. Deeper content shows as text. */
const maxDepth = 16

class BlockParser {
  readonly definitions = new Map<string, string>()
  private depth = 0
  /** The empty table cells of the file, shared by quotes and lists. */
  private readonly tables = new TableBudget()
  /** The line of the file where the lines of the current parse start. */
  private origin = 0
  private tailLine: number | null = null

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
   */
  nested = (lines: readonly string[], start: number): MdBlock[] => {
    if (this.tailLine !== null) return []
    if (this.depth + 1 >= maxDepth) {
      return [{ kind: 'paragraph', text: lines.join('\n').trim() }]
    }
    const origin = this.origin
    this.depth += 1
    this.origin = origin + start
    try {
      return this.parse(lines)
    } finally {
      this.depth -= 1
      this.origin = origin
    }
  }

  parse = (lines: readonly string[]): MdBlock[] => {
    const blocks: MdBlock[] = []
    let index = 0
    while (index < lines.length && this.tailLine === null) {
      const line = lines[index]
      if (isBlank(line)) {
        index += 1
        continue
      }
      index = this.block(lines, index, blocks)
    }
    return blocks
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
        const text = lines[next]
        code.push(text.slice(Math.min(fence.indent, indentOf(text))))
        next += 1
      }
      blocks.push({ kind: 'code', text: code.join('\n') })
      return next + 1
    }
    const heading = atxHeading.exec(line)
    if (heading) {
      const level = headingLevels[heading[1].length - 1]
      const text = withoutClosingHashes(heading[2]).trim()
      blocks.push({ kind: 'heading', level, text })
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
      const list = parseList(lines, index, marker, startsBlock, (item, at) => {
        if (this.tailLine === null) kept += 1
        return this.nested(item, at)
      })
      // The items after the start of the tail are in the tail.
      if (list.block.kind === 'list') list.block.items.splice(kept)
      blocks.push(list.block)
      return list.next
    }
    if (tableStarts(lines, index)) {
      const table = parseTable(lines, index, this.tables)
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
    blocks.push({ kind: 'quote', blocks: this.nested(inner, index) })
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
      const underline = /^ {0,3}(=+|-+)[ ]*$/.exec(line)
      if (underline) {
        const rest = takeDefinitions(text, this.definitions)
        if (rest.length === 0) break
        const level = underline[1][0] === '=' ? 1 : 2
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
