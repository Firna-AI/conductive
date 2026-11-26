import type { Token } from 'markdown-it'
import { tableColumns } from '../../markdown/table-source'
import { unquoted } from '../../markdown/token-read'

/**
 * Where text that the agent still writes ends: in a paragraph, a heading,
 * or a table cell, whose open marks can still get their pair, as "While
 * the agent writes" of `chat-markdown.md` says. In another block, such as
 * a code block, or after a blank line, no open mark can get its pair.
 */

/** Whether the last line of the text holds only spaces and quote marks. */
function blankEnd(lines: readonly string[]): boolean {
  return /^[\s>]*$/u.test(lines.at(-1) ?? '')
}

/**
 * Whether a paragraph or a heading holds the end of the text: its last line
 * is the last line of the text. A paragraph also holds the end when only a
 * line break follows it, because the next line can still continue it.
 */
function endsIn(open: Token, lines: readonly string[]): boolean {
  const end = open.map?.[1] ?? 0
  if (end === lines.length) return true
  const paragraph = open.type === 'paragraph_open'
  return paragraph && end === lines.length - 1 && blankEnd(lines)
}

/**
 * Whether the cell of the inline token at `at` holds the end of the text:
 * its row is the last line, it is the last cell that the row shows, and no
 * pipe closes it. The quote marks of a row are the marks of the quotes
 * around its table, because a line that starts with `>` ends a table.
 */
function endsInCell(
  tokens: readonly Token[],
  at: number,
  lines: readonly string[],
): boolean {
  if (tokens[at + 2]?.type !== 'tr_close') return false
  let row = at
  while (row > 0 && tokens[row].type !== 'tr_open') row -= 1
  if (tokens[row].map?.[0] !== lines.length - 1) return false
  const line = unquoted(lines.at(-1) ?? '', Infinity).trim()
  if (line.endsWith('|') && !line.endsWith('\\|')) return false
  const cells = tokens
    .slice(row, at)
    .filter((token) => token.type === 'td_open')
  return tableColumns(line).length === cells.length
}

/**
 * The inline token of the paragraph, the heading, or the table cell where
 * the text ends, or null when the text ends in another block.
 */
export function liveEnd(
  tokens: readonly Token[],
  lines: readonly string[],
): Token | null {
  const at = tokens.findLastIndex((token) => token.type === 'inline')
  if (at < 1) return null
  const open = tokens[at - 1]
  switch (open.type) {
    case 'paragraph_open':
    case 'heading_open':
      return endsIn(open, lines) ? tokens[at] : null
    case 'td_open':
      return endsInCell(tokens, at, lines) ? tokens[at] : null
    default:
      return null
  }
}
