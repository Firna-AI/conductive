import { isBlank } from '../../markdown/lines'
import { readTableRow, readTableSeparator } from '../../markdown/table-rows'
import type { MdBlock } from './markdown-blocks'

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

/**
 * Reads a table up to the first blank line, line without a pipe, line for
 * which `ends` holds, or row whose empty cells would pass the budget of the
 * file. A short row gets empty cells up to the width of the header.
 */
export function parseTable(
  lines: readonly string[],
  index: number,
  budget: TableBudget,
  ends: (index: number) => boolean,
): { block: MdBlock; next: number } {
  const head = readTableRow(lines[index])
  const align = readTableSeparator(lines[index + 1]) ?? head.map(() => null)
  const rows: string[][] = []
  let next = index + 2
  for (; next < lines.length; next += 1) {
    const line = lines[next]
    if (isBlank(line) || !line.includes('|') || ends(next)) break
    const cells = readTableRow(line)
    // Check the empty cells before the row is built.
    if (!budget.take(Math.max(0, head.length - cells.length))) break
    rows.push(head.map((_, column) => cells[column] ?? ''))
  }
  return { block: { kind: 'table', align, head, rows }, next }
}
