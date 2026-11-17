import type { Token } from 'markdown-it'
import {
  readTableRow,
  type CellAlign,
  type TableCells,
} from '../../markdown/table-rows'
import { inlineText, type InlineText } from './agent-inline'
import { unquoted } from './agent-source'

/** A table of an agent message. Each body row keeps its own cells. */
export type TextTable = { kind: 'table' } & TableCells<InlineText>

/** A body row as the parser read it, with its source line. */
interface SourceRow {
  /** The source line of the row, without the marks of its quotes. */
  line: string
  cells: InlineText[]
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
 * The cells that a body row shows: the cells that its source line has, up
 * to the width of the header. The parser fills a short row with empty
 * cells, and the chat adds none, so the last cell spans the rest, as
 * "Short rows" of `chat-tables.md` says.
 */
function ownCells(row: SourceRow): InlineText[] {
  return row.cells.slice(0, readTableRow(row.line).length)
}

/**
 * The number of body rows that stay in the table. The rows after them show
 * as the text of a paragraph under the table, so no text is lost.
 *
 * TODO: open question, item 13 of the Markdown parser plan. `chat-tables.md`
 * says that a line without a pipe ends the table. `markdown-it` reads such a
 * line as one more row, as GitHub does. Until the user decides, each row
 * that the parser reads stays in the table.
 */
function rowsInTable(rows: readonly SourceRow[]): number {
  return rows.length
}

/** A table of an agent message, and what the parser read after it. */
export interface TableRead {
  table: TextTable
  /** The source lines of the rows that leave the table, without marks. */
  rest: string[]
  /** The index of the token after the table. */
  next: number
}

/**
 * Reads the table whose `table_open` token is at `at`. `lines` are the
 * source lines, and `quotes` is the number of quotes around the table. The
 * parser ends a table at the row whose short rows would fill more than
 * 65,536 empty cells, and the rows after it read as text (open question,
 * item 15 of the Markdown parser plan).
 */
export function readTable(
  tokens: readonly Token[],
  at: number,
  lines: readonly string[],
  quotes: number,
): TableRead {
  let head: InlineText[] = []
  const align: CellAlign[] = []
  const rows: SourceRow[] = []
  let row: SourceRow = { line: '', cells: [] }
  let body = false
  let index = at + 1
  for (; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token.type === 'table_close') break
    if (token.type === 'tbody_open') body = true
    else if (token.type === 'th_open') align.push(alignOf(token))
    else if (token.type === 'inline') row.cells.push(inlineText(token.children))
    else if (token.type === 'tr_open') {
      const line = token.map ? (lines[token.map[0]] ?? '') : ''
      row = { line: unquoted(line, quotes), cells: [] }
    } else if (token.type === 'tr_close') {
      if (body) rows.push(row)
      else head = row.cells
    }
  }
  const kept = rowsInTable(rows)
  return {
    table: {
      kind: 'table',
      head,
      rows: rows.slice(0, kept).map(ownCells),
      align,
    },
    rest: rows.slice(kept).map((source) => source.line),
    next: index + 1,
  }
}
