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
  | { kind: 'ul'; items: readonly string[] }
  | { kind: 'ol'; start: number; items: readonly string[] }
  | { kind: 'code'; text: string }
  | TextTable

/** A list of an answer while the parse adds its items. */
type OpenList =
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; start: number; items: string[] }

const bullet = /^\s*[-*+]\s+(.*)$/
/** A number of one to nine digits, as Markdown allows in a list marker. */
const numbered = /^\s*(\d{1,9})[.)]\s+(.*)$/
const heading = /^#{1,6}\s+(.*)$/

/**
 * The item that a line starts, with its text, or null for another line. A
 * new list takes its kind and, for a numbered list, its start from it.
 */
function listItem(line: string): { list: OpenList; text: string } | null {
  const point = bullet.exec(line)
  if (point) return { list: { kind: 'ul', items: [] }, text: point[1] }
  const step = numbered.exec(line)
  if (!step) return null
  const start = Number(step[1])
  return { list: { kind: 'ol', start, items: [] }, text: step[2] }
}

/**
 * Reads the table whose header row is at `index`, up to the first blank
 * line, line without a pipe, or the end of the text. A body row keeps the
 * cells that it has, up to the width of the header, and gets no empty
 * cells. `last` is the index of the last line of the table.
 */
function readTable(
  lines: readonly string[],
  index: number,
): { table: TextTable; last: number } {
  const head = readTableRow(lines[index])
  const align = readTableSeparator(lines[index + 1]) ?? head.map(() => null)
  const rows: string[][] = []
  let last = index + 1
  while (last + 1 < lines.length) {
    const line = lines[last + 1]
    if (line.trim() === '' || !line.includes('|')) break
    rows.push(readTableRow(line).slice(0, head.length))
    last += 1
  }
  return { table: { kind: 'table', head, rows, align }, last }
}

/**
 * Splits an answer into paragraphs, lists, code blocks, and tables. Text
 * that the agent still writes can end inside a code block, which then runs
 * to the end. A header row shows as text until its separator row arrives.
 * A table can start directly after a line of a paragraph or a list.
 */
export function textBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = []
  let paragraph: string[] = []
  let list: OpenList | null = null
  let code: string[] | null = null
  const flush = () => {
    if (paragraph.length > 0)
      blocks.push({ kind: 'p', text: paragraph.join(' ') })
    if (list) blocks.push(list)
    paragraph = []
    list = null
  }
  const lines = text.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (code) {
      if (line.trimStart().startsWith('```')) {
        blocks.push({ kind: 'code', text: code.join('\n') })
        code = null
      } else code.push(line)
      continue
    }
    if (line.trimStart().startsWith('```')) {
      flush()
      code = []
      continue
    }
    if (tableStarts(lines, index)) {
      flush()
      const { table, last } = readTable(lines, index)
      blocks.push(table)
      index = last
      continue
    }
    const item = listItem(line)
    if (item) {
      if (paragraph.length > 0 || (list && list.kind !== item.list.kind)) {
        flush()
      }
      list ??= item.list
      list.items.push(item.text)
      continue
    }
    if (line.trim() === '') {
      flush()
      continue
    }
    if (list && /^\s+\S/.test(line)) {
      const last = list.items.length - 1
      list.items[last] = `${list.items[last]} ${line.trim()}`
      continue
    }
    if (list) flush()
    paragraph.push(heading.exec(line)?.[1] ?? line.trim())
  }
  flush()
  if (code) blocks.push({ kind: 'code', text: code.join('\n') })
  return blocks
}
