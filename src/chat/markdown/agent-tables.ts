import type { Token } from 'markdown-it'
import type { TableCells } from '../../markdown/table-rows'
import { readTableTokens } from '../../markdown/table-tokens'
import { inlineText, type InlineText } from './agent-inline'

/** A table of an agent message. Each body row has at least one cell. */
export type TextTable = { kind: 'table' } & TableCells<InlineText>

/** A table of an agent message and the next token. */
export interface TableRead {
  table: TextTable
  /** No row leaves the table. Kept for the block reader's current return shape. */
  rest: []
  /** The index of the token after the table. */
  next: number
}

/**
 * Reads the table whose `table_open` token is at `at`. `lines` are the
 * source lines, and `quotes` is the number of quotes around the table.
 * Each parsed row keeps its source cells, up to the width of the header.
 * A row with no source cell gets one empty cell. The last cell spans the
 * rest, as "Short rows" of `chat-tables.md` says.
 */
export function readTable(
  tokens: readonly Token[],
  at: number,
  lines: readonly string[],
  quotes: number,
): TableRead {
  const read = readTableTokens(tokens, at, lines, quotes, inlineText)
  return {
    table: {
      kind: 'table',
      head: read.head,
      rows: read.rows.map((row) => row.cells),
      align: read.align,
    },
    rest: [],
    next: read.next,
  }
}
