import type { Token } from 'markdown-it'
import type { CellAlign } from './table-rows'
import { unquoted } from './token-read'

/** A body row as the parser read it, with its source line. */
interface TableRow<Cell> {
  /** The source line of the row, without the marks of its quotes. */
  line: string
  cells: Cell[]
}

/** A table as the parser read it, with the cells of one view. */
export interface TableTokens<Cell> {
  head: Cell[]
  align: CellAlign[]
  rows: TableRow<Cell>[]
  /** The index of the source line of the row that ended the read, or null. */
  stop: number | null
  /** The index of the token after the table. */
  next: number
}

/** The alignment of a column, from the style of its header cell. */
function alignOf(token: Token): CellAlign {
  const style = token.attrGet('style')
  if (style === 'text-align:left') return 'left'
  if (style === 'text-align:center') return 'center'
  if (style === 'text-align:right') return 'right'
  return null
}

/**
 * Reads the table whose `table_open` token is at `at`. `lines` are the
 * source lines, and `quotes` is the number of quotes around the table.
 * `cell` gives the cell of the view for the inline tokens of one cell. The
 * parser emits only the source cells, up to the width of the header.
 * `stop` gives the recorded source line of a missing-cell stop, or the
 * first row that `keeps` refuses before the view creates its cells.
 */
export function readTableTokens<Cell>(
  tokens: readonly Token[],
  at: number,
  lines: readonly string[],
  quotes: number,
  cell: (children: Token[] | null) => Cell,
  keeps: (line: string, columns: number) => boolean = () => true,
): TableTokens<Cell> {
  let head: Cell[] = []
  const align: CellAlign[] = []
  const rows: TableRow<Cell>[] = []
  let row: TableRow<Cell> = { line: '', cells: [] }
  let body = false
  const stopLine = tokens[at].meta?.tableStopLine
  let stop = typeof stopLine === 'number' ? stopLine : null
  let index = at + 1
  for (; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token.type === 'table_close') break
    if (token.type === 'tbody_open') body = true
    else if (token.type === 'th_open') align.push(alignOf(token))
    else if (token.type === 'inline') row.cells.push(cell(token.children))
    else if (token.type === 'tr_open') {
      const source = token.map?.[0]
      const line = source === undefined ? '' : (lines[source] ?? '')
      row = { line: unquoted(line, quotes), cells: [] }
      if (body && !keeps(row.line, align.length)) {
        stop = source ?? null
        break
      }
    } else if (token.type === 'tr_close') {
      if (body) rows.push(row)
      else head = row.cells
    }
  }
  while (index < tokens.length && tokens[index].type !== 'table_close') {
    index += 1
  }
  return { head, align, rows, stop, next: index + 1 }
}
