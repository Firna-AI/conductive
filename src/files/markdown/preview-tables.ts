import type { Token } from 'markdown-it'
import { readTableRow } from '../../markdown/table-rows'
import { readTableTokens } from '../../markdown/table-tokens'
import { unquoted } from '../../markdown/token-read'
import type { MdBlock } from './markdown-document'
import { previewInline } from './preview-inline'

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
 * The empty cells that the parser adds to a body row, up to `columns`. It
 * counts the cells of a row as the parser does: as `readTableRow` does,
 * apart from a row of one pipe, `|`, which has no cell. So the budget of
 * the file ends a table at the latest at the row where the parser's own
 * limit ends it.
 */
function addedCells(line: string, columns: number): number {
  const cells = line.trim() === '|' ? 0 : readTableRow(line).length
  return Math.max(0, columns - cells)
}

/**
 * Whether the line at `end`, after a table, starts the next block of the
 * table's container as a paragraph, a table, or a heading with an
 * underline. The parser starts no such block where a table could go on,
 * so it ended the table there only because that row would fill too many
 * empty cells. Its own limit is 65,536 empty cells in one table.
 */
function endedByCells(token: Token | undefined, end: number): boolean {
  if (token?.map?.[0] !== end) return false
  if (token.type === 'paragraph_open' || token.type === 'table_open') {
    return true
  }
  return token.type === 'heading_open' && /^[-=]$/u.test(token.markup)
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
 * parser fills each short row with empty cells. The row whose empty cells
 * do not fit in the budget of the file ends the table, and the rest of the
 * file from that row shows as text, as "Files and changes" of
 * `workspace-tools.md` says.
 *
 * Open question, item 13 of the Markdown parser plan: `chat-tables.md`
 * says that a line without a pipe ends a table, and the parser reads such
 * a line as one more row, as GitHub does. Until the user decides, each row
 * that the parser reads stays in the table, within the budget.
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
  let tail = read.stop
  const end = tokens[at].map?.[1]
  if (tail === null && end !== undefined && end < lines.length) {
    const row = unquoted(lines[end], quotes)
    const cells = addedCells(row, read.align.length)
    if (endedByCells(tokens[read.next], end) && !budget.fits(cells)) tail = end
  }
  const { head, align } = read
  const rows = read.rows.map((row) => row.cells)
  return { block: { kind: 'table', head, align, rows }, tail, next: read.next }
}
