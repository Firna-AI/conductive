import {
  atxHeading,
  setextLevel,
  type HeadingLevel,
} from '../../markdown/headings'
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
import { isQuote, Paragraph } from './agent-paragraph'

/** A table of an answer. Each body row keeps its own cells. */
export type TextTable = { kind: 'table' } & TableCells<string>

/**
 * A block of an agent's answer, from the Markdown that the agent writes. A
 * heading keeps the level that the agent wrote, and its text can be empty
 * while the agent writes it. A numbered list counts up from `start`, the
 * number of its first item, as Markdown numbers it.
 */
export type TextBlock =
  | { kind: 'p'; text: string }
  | { kind: 'heading'; level: HeadingLevel; text: string }
  | { kind: 'ul'; items: readonly TextItem[] }
  | { kind: 'ol'; start: number; items: readonly TextItem[] }
  | { kind: 'code'; text: string }
  | TextTable

/** A list of an answer. */
export type TextList = Extract<TextBlock, { kind: 'ul' | 'ol' }>

/** The blocks of one list item, from the lines indented under its marker. */
export type TextItem = readonly TextBlock[]

function isFence(line: string): boolean {
  return line.trimStart().startsWith('```')
}

/**
 * Whether the line at `index` starts a block, so it ends the text of a list
 * item. A quote shows as text, but it still ends the item.
 */
function startsBlock(lines: readonly string[], index: number): boolean {
  const line = lines[index]
  if (isFence(line) || atxHeading(line) !== null || isQuote(line)) return true
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
 * continues no paragraph, as the list reader asks. `ends` says whether the
 * last of the lines ends the text, so no line break follows it.
 */
function parseLines(
  lines: readonly string[],
  raw: readonly string[],
  depth: number,
  lazy: ReadonlySet<number> = noLazyLines,
  ends = true,
): ItemBlocks<TextBlock> {
  const blocks: TextBlock[] = []
  const paragraph = new Paragraph()
  let code: string[] | null = null
  const flush = () => {
    blocks.push(...paragraph.take())
  }
  const finish = (end: number): ItemBlocks<TextBlock> => {
    flush()
    if (code) blocks.push({ kind: 'code', text: code.join('\n') })
    return { blocks, end }
  }
  const rules: ListRules<TextBlock> = {
    startsBlock,
    parseItem: (item, start, itemLazy) => {
      // The item ends the text when its last line is the last of the lines.
      const last = ends && start + item.length === lines.length
      return itemBlocks(item, depth, itemLazy, last)
    },
    tasks: false,
  }
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (lazy.has(index) && (code !== null || !paragraph.open)) {
      return finish(index)
    }
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
    const heading = atxHeading(line)
    if (heading) {
      flush()
      blocks.push({ kind: 'heading', ...heading })
      continue
    }
    const marker = isRule(line) ? null : listMarker(line)
    if (marker && (!paragraph.open || interruptsParagraph(marker))) {
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
    // An underline counts only when a line break follows it, so the text
    // above it stays a paragraph while the agent may still write a list. A
    // lazy line is never an underline, as in CommonMark.
    const level = lazy.has(index) ? null : setextLevel(line)
    const broken = index + 1 < lines.length || !ends
    const underlined =
      level !== null && broken ? paragraph.underline(level) : null
    if (underlined) blocks.push(...underlined)
    else paragraph.add(line, lazy.has(index))
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
  ends: boolean,
): ItemBlocks<TextBlock> {
  if (depth + 1 < maxNesting) {
    return parseLines(lines, lines, depth + 1, lazy, ends)
  }
  const text = lines
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join(' ')
  const blocks: TextBlock[] = text === '' ? [] : [{ kind: 'p', text }]
  return { blocks, end: lines.length }
}

/**
 * Splits an answer into paragraphs, headings, lists, code blocks, and
 * tables. A heading is a line of hashes and its text, or the text of a
 * paragraph above an underline, as in CommonMark and the file preview. An
 * underline counts only when a line break follows it. A list item holds the
 * lines indented under it, by the list rules of the file preview, and a
 * list starts after a line of a paragraph only where CommonMark lets it.
 * Text that the agent still writes can end inside a code block, which then
 * runs to the end. A header row shows as text until its separator row
 * arrives. A table can start directly after a line of a paragraph or a
 * list.
 */
export function textBlocks(text: string): TextBlock[] {
  const raw = text.split('\n')
  return parseLines(raw.map(expandTabs), raw, 0).blocks
}
