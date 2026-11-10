import { expandTabs, isBlank, isRule } from '../../markdown/lines'
import {
  interruptsParagraph,
  listMarker,
  maxNesting,
  readList,
  type ItemBlocks,
  type ListBlocks,
  type ListRules,
} from '../../markdown/list-items'
import {
  readTableRow,
  readTableSeparator,
  tableStarts,
  type TableCells,
} from '../../markdown/table-rows'

/** A table of an answer. Each body row keeps its own cells. */
export type TextTable = { kind: 'table' } & TableCells<string>

/**
 * A block of an agent's answer, from the Markdown that the agent writes. A
 * numbered list counts up from `start`, the number of its first item, as
 * Markdown numbers it.
 */
export type TextBlock =
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: readonly TextItem[] }
  | { kind: 'ol'; start: number; items: readonly TextItem[] }
  | { kind: 'code'; text: string }
  | TextTable

/** A list of an answer. */
export type TextList = Extract<TextBlock, { kind: 'ul' | 'ol' }>

/** The blocks of one list item, from the lines indented under its marker. */
export type TextItem = readonly TextBlock[]

const heading = /^ {0,3}#{1,6}\s+(.*)$/
const quote = /^ {0,3}>/

function isFence(line: string): boolean {
  return line.trimStart().startsWith('```')
}

/**
 * Whether the line at `index` starts a block, so it ends the text of a list
 * item. A heading and a quote show as text, but they still end the item.
 */
function startsBlock(lines: readonly string[], index: number): boolean {
  const line = lines[index]
  if (isFence(line) || heading.test(line) || quote.test(line)) return true
  return tableStarts(lines, index)
}

/**
 * Reads the table whose header row is at `index`, up to the first blank
 * line, line without a pipe, line in `lazy`, or the end of the text. A
 * body row keeps the cells that it has, up to the width of the header, and
 * gets no empty cells. `last` is the index of the last line of the table.
 */
function readTable(
  lines: readonly string[],
  index: number,
  lazy: ReadonlySet<number>,
): { table: TextTable; last: number } {
  const head = readTableRow(lines[index])
  const align = readTableSeparator(lines[index + 1]) ?? head.map(() => null)
  const rows: string[][] = []
  let last = index + 1
  while (last + 1 < lines.length) {
    const line = lines[last + 1]
    if (line.trim() === '' || !line.includes('|') || lazy.has(last + 1)) {
      break
    }
    rows.push(readTableRow(line).slice(0, head.length))
    last += 1
  }
  return { table: { kind: 'table', head, rows, align }, last }
}

/** A list from the list reader, as a block of an answer. */
function textList(list: ListBlocks<TextBlock>): TextList {
  const items = list.items.map((item) => item.blocks)
  if (!list.ordered) return { kind: 'ul', items }
  return { kind: 'ol', start: list.start, items }
}

/** A text without unindented lines of a list item. */
const noLazyLines: ReadonlySet<number> = new Set()

/**
 * The blocks of the lines of an answer, or of one list item. `raw` holds
 * the lines with their tabs, which a code block keeps. `depth` counts the
 * lists around the lines. The parse stops at the first line in `lazy` that
 * continues no paragraph, as the list reader asks.
 */
function parseLines(
  lines: readonly string[],
  raw: readonly string[],
  depth: number,
  lazy: ReadonlySet<number> = noLazyLines,
): ItemBlocks<TextBlock> {
  const blocks: TextBlock[] = []
  let paragraph: string[] = []
  // Whether the last line of `paragraph` is its text, so it is open. A
  // heading or a rule shows as text too, but it closes the paragraph.
  let open = false
  let code: string[] | null = null
  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'p', text: paragraph.join(' ') })
    }
    paragraph = []
    open = false
  }
  const finish = (end: number): ItemBlocks<TextBlock> => {
    flush()
    if (code) blocks.push({ kind: 'code', text: code.join('\n') })
    return { blocks, end }
  }
  const rules: ListRules<TextBlock> = {
    startsBlock,
    parseItem: (item, _start, itemLazy) => itemBlocks(item, depth, itemLazy),
    tasks: false,
  }
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (lazy.has(index) && (code !== null || !open)) return finish(index)
    if (code) {
      if (isFence(line)) {
        blocks.push({ kind: 'code', text: code.join('\n') })
        code = null
      } else code.push(raw[index])
      continue
    }
    if (isFence(line)) {
      flush()
      code = []
      continue
    }
    const marker = isRule(line) ? null : listMarker(line)
    if (marker && (!open || interruptsParagraph(marker))) {
      flush()
      const { list, next } = readList(lines, index, marker, rules)
      blocks.push(textList(list))
      index = next - 1
      continue
    }
    if (tableStarts(lines, index)) {
      flush()
      const { table, last } = readTable(lines, index, lazy)
      blocks.push(table)
      index = last
      continue
    }
    if (isBlank(line)) {
      flush()
      continue
    }
    const title = heading.exec(line)
    paragraph.push(title?.[1] ?? line.trim())
    open = title === null && !isRule(line)
  }
  return finish(lines.length)
}

/**
 * The blocks of one list item. Lists nest at most `maxNesting` deep, as in
 * the file preview, so deeper content shows as the text of a paragraph.
 */
function itemBlocks(
  lines: readonly string[],
  depth: number,
  lazy: ReadonlySet<number>,
): ItemBlocks<TextBlock> {
  if (depth + 1 < maxNesting) return parseLines(lines, lines, depth + 1, lazy)
  const text = lines
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join(' ')
  const blocks: TextBlock[] = text === '' ? [] : [{ kind: 'p', text }]
  return { blocks, end: lines.length }
}

/**
 * Splits an answer into paragraphs, lists, code blocks, and tables. A list
 * item holds the lines indented under it, by the list rules of the file
 * preview, and a list starts after a line of a paragraph only where
 * CommonMark lets it. Text that the agent still writes can end inside a code block,
 * which then runs to the end. A header row shows as text until its
 * separator row arrives. A table can start directly after a line of a
 * paragraph or a list.
 */
export function textBlocks(text: string): TextBlock[] {
  const raw = text.split('\n')
  return parseLines(raw.map(expandTabs), raw, 0).blocks
}
