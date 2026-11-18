import type { Token } from 'markdown-it'
import { tableColumns } from '../../markdown/table-source'
import { readTableTokens } from '../../markdown/table-tokens'
import type { MdBlock } from './markdown-document'
import { previewInline } from './preview-inline'

/** The empty cells that the tables of one file may add to fill short rows. */
export const maxAddedCells = 65_536

/**
 * The empty cells that the tables of one file may still add. Every table
 * of the file takes from it, also in a quote or a list. A row that would
 * pass it ends its table, and the rest of the file shows as text. So the
 * cells of a file stay in proportion to its size.
 */
export class TableBudget {
  private left = maxAddedCells

  /** Whether the empty cells of one row fit in what is left. */
  fits(cells: number): boolean {
    return cells <= this.left
  }

  /** Takes the empty cells of one row. False, with nothing taken, when they do not fit. */
  take(cells: number): boolean {
    if (!this.fits(cells)) return false
    this.left -= cells
    return true
  }
}

/**
 * The empty cells that the preview adds to a body row, up to `columns`.
 * The shared row split keeps its count aligned with block parsing,
 * including a row of one pipe, `|`, which has no source cell.
 */
function addedCells(line: string, columns: number): number {
  const cells = tableColumns(line.trim()).length
  return Math.max(0, columns - cells)
}

/** A table of the file, and where the rest of the file shows as text. */
export interface PreviewTable {
  block: MdBlock
  /** The index of the source line that starts the text, or null. */
  tail: number | null
  /** The index of the token after the table. */
  next: number
}

/**
 * Reads the table whose `table_open` token is at `at`. `lines` are the
 * source lines, and `quotes` is the number of quotes around the table. The
 * adapter fills each short row with empty cells. The row whose empty cells
 * do not fit in the budget of the file ends the table, and the rest of the
 * file from that row shows as text, as "Files and changes" of
 * `workspace-tools.md` says. Each other row that the parser reads stays in
 * the table, also a line without a pipe, as "Table text" of
 * `chat-tables.md` says.
 */
export function previewTable(
  tokens: readonly Token[],
  at: number,
  lines: readonly string[],
  quotes: number,
  budget: TableBudget,
): PreviewTable {
  const read = readTableTokens(
    tokens,
    at,
    lines,
    quotes,
    previewInline,
    (line, columns) => budget.take(addedCells(line, columns)),
  )
  const { head, align } = read
  const rows = read.rows.map((row) => {
    while (row.cells.length < head.length) row.cells.push([])
    return row.cells
  })
  return {
    block: { kind: 'table', head, align, rows },
    tail: read.stop,
    next: read.next,
  }
}
