import {
  closesFence,
  expandTabs,
  indentOf,
  isBlank,
  isRule,
  openingFence,
} from './markdown-lines'
import { listMarker, parseList } from './markdown-lists'
import { parseTable, tableStarts } from './markdown-tables'
import { takeDefinitions } from './markdown-text'

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
export type CellAlign = 'left' | 'center' | 'right' | null

/** One block of a Markdown file. Inline text stays raw until it renders. */
export type MdBlock =
  | { kind: 'heading'; level: HeadingLevel; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'quote'; blocks: MdBlock[] }
  | { kind: 'list'; ordered: boolean; start: number; items: MdListItem[] }
  | { kind: 'rule' }
  | { kind: 'table'; align: CellAlign[]; head: string[]; rows: string[][] }

export interface MdListItem {
  /** A task item is done or not done. Null for other items. */
  checked: boolean | null
  blocks: MdBlock[]
}

export interface MarkdownDocument {
  blocks: MdBlock[]
  /** Link reference definitions, by their normalized label. */
  definitions: ReadonlyMap<string, string>
}

const headingLevels: readonly HeadingLevel[] = [1, 2, 3, 4, 5, 6]
const quoteLine = /^ {0,3}> ?/
const atxHeading = /^ {0,3}(#{1,6})(?:[ ]+|$)(.*)$/

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

  /** Parses the content of a quote or a list item, one level deeper. */
  nested = (lines: readonly string[]): MdBlock[] => {
    if (this.depth + 1 >= maxDepth) {
      return [{ kind: 'paragraph', text: lines.join('\n').trim() }]
    }
    this.depth += 1
    try {
      return this.parse(lines)
    } finally {
      this.depth -= 1
    }
  }

  parse = (lines: readonly string[]): MdBlock[] => {
    const blocks: MdBlock[] = []
    let index = 0
    while (index < lines.length) {
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
      const text = heading[2].replace(/(?:^|[ ]+)#+[ ]*$/, '').trim()
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
      const list = parseList(lines, index, marker, startsBlock, this.nested)
      blocks.push(list.block)
      return list.next
    }
    if (tableStarts(lines, index)) {
      const table = parseTable(lines, index)
      blocks.push(table.block)
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
    blocks.push({ kind: 'quote', blocks: this.nested(inner) })
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

/** Parses Markdown into blocks. The parser never runs or keeps HTML. */
export function parseMarkdown(source: string): MarkdownDocument {
  const lines = source.split(/\r\n|\n|\r/).map(expandTabs)
  const parser = new BlockParser()
  const blocks = parser.parse(lines)
  return { blocks, definitions: parser.definitions }
}
