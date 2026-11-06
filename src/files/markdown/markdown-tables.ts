import type { CellAlign, MdBlock } from './markdown-blocks'
import { isBlank } from './markdown-lines'

/** The cells of one table row. A `\|` stays a pipe inside a cell. */
function cellsOf(line: string): string[] {
  let row = line.trim()
  if (row.startsWith('|')) row = row.slice(1)
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1)
  const cells: string[] = []
  let cell = ''
  for (let index = 0; index < row.length; index += 1) {
    const char = row[index]
    if (char === '\\' && row[index + 1] === '|') {
      cell += '|'
      index += 1
    } else if (char === '|') {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += char
    }
  }
  cells.push(cell.trim())
  return cells
}

function alignOf(cell: string): CellAlign | undefined {
  if (!/^:?-+:?$/.test(cell)) return undefined
  const left = cell.startsWith(':')
  const right = cell.endsWith(':')
  if (left && right) return 'center'
  if (right) return 'right'
  return left ? 'left' : null
}

function delimiterRow(line: string): CellAlign[] | null {
  if (!line.includes('-')) return null
  const align: CellAlign[] = []
  for (const cell of cellsOf(line)) {
    const value = alignOf(cell)
    if (value === undefined) return null
    align.push(value)
  }
  return align
}

/** The empty cells that the tables of one file may add to fill short rows. */
const maxAddedCells = 65_536

/**
 * The empty cells that the tables of one file may still add. Every table
 * of the file takes from it, also in a quote or a list. A row that would
 * pass it ends its table, and the rest of the file shows as text. So the
 * cells of a file stay in proportion to its size.
 */
export class TableBudget {
  private left = maxAddedCells
  private ended = false

  /** True until a row would pass the budget. */
  get open(): boolean {
    return !this.ended
  }

  /** Takes the empty cells of one row. False when they would pass it. */
  take(cells: number): boolean {
    if (cells > this.left) {
      this.ended = true
      return false
    }
    this.left -= cells
    return true
  }
}

/** A header row with a pipe, then a delimiter row with as many cells. */
export function tableStarts(lines: readonly string[], index: number): boolean {
  const head = lines[index]
  const delimiter = lines[index + 1]
  if (!head.includes('|') || delimiter === undefined) return false
  const align = delimiterRow(delimiter)
  return align !== null && align.length === cellsOf(head).length
}

/**
 * Reads a table up to the first blank line, line without a pipe, or row
 * whose empty cells would pass the budget of the file. A short row gets
 * empty cells up to the width of the header.
 */
export function parseTable(
  lines: readonly string[],
  index: number,
  budget: TableBudget,
): { block: MdBlock; next: number } {
  const head = cellsOf(lines[index])
  const align = delimiterRow(lines[index + 1]) ?? head.map(() => null)
  const rows: string[][] = []
  let next = index + 2
  for (; next < lines.length; next += 1) {
    const line = lines[next]
    if (isBlank(line) || !line.includes('|')) break
    const cells = cellsOf(line)
    // Check the empty cells before the row is built.
    if (!budget.take(Math.max(0, head.length - cells.length))) break
    rows.push(head.map((_, column) => cells[column] ?? ''))
  }
  return { block: { kind: 'table', align, head, rows }, next }
}
