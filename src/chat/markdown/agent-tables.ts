import type { Token } from 'markdown-it'
import { readTableRow, type TableCells } from '../../markdown/table-rows'
import { readTableTokens, type TableRow } from '../../markdown/table-tokens'
import { inlineText, type InlineText } from './agent-inline'

/** A table of an agent message. Each body row keeps its own cells. */
export type TextTable = { kind: 'table' } & TableCells<InlineText>

/**
 * The cells that a body row shows: the cells that its source line has, up
 * to the width of the header. The parser fills a short row with empty
 * cells, and the chat adds none, so the last cell spans the rest, as
 * "Short rows" of `chat-tables.md` says.
 */
function ownCells(row: TableRow<InlineText>): InlineText[] {
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
function rowsInTable(rows: readonly TableRow<InlineText>[]): number {
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
  const read = readTableTokens(tokens, at, lines, quotes, inlineText)
  const kept = rowsInTable(read.rows)
  return {
    table: {
      kind: 'table',
      head: read.head,
      rows: read.rows.slice(0, kept).map(ownCells),
      align: read.align,
    },
    rest: read.rows.slice(kept).map((source) => source.line),
    next: read.next,
  }
}
