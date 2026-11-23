import type { Token } from 'markdown-it'
import type { TableCells } from '../../markdown/table-rows'
import { readTableTokens } from '../../markdown/table-tokens'
import { inlineText, type InlineText } from './agent-inline'
import type { AgentRead } from './agent-paragraphs'
import { closedMarks } from './live-marks'

/** A table of an agent message. Each body row has at least one cell. */
export type TextTable = { kind: 'table' } & TableCells<InlineText>

/** A table of an agent message and the next token. */
interface TableRead {
  table: TextTable
  /** The index of the token after the table. */
  next: number
}

/**
 * Reads the table whose `table_open` token is at `at`. `lines` are the
 * source lines, and `quotes` is the number of quotes around the table.
 * Each parsed row keeps its source cells, up to the width of the header.
 * A row with no source cell gets one empty cell. The last cell spans the
 * rest, as "Short rows" of `chat-tables.md` says. `block.live` is the inline
 * token where the text of a live message ends: when it is a cell of this
 * table, its open marks close at its end.
 */
export function readTable(
  tokens: readonly Token[],
  at: number,
  lines: readonly string[],
  quotes: number,
  block: Pick<AgentRead, 'live' | 'references'>,
): TableRead {
  const { live, references } = block
  const cell = (children: Token[] | null) => {
    const closed =
      live !== null && children !== null && children === live.children
        ? closedMarks(live.content, references)
        : null
    return inlineText(closed ?? children)
  }
  const read = readTableTokens(tokens, at, lines, quotes, cell)
  return {
    table: {
      kind: 'table',
      head: read.head,
      rows: read.rows.map((row) => row.cells),
      align: read.align,
    },
    next: read.next,
  }
}
