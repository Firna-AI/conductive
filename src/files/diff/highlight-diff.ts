import { highlightLines, type Token } from '../code/highlight'
import type { Language } from '../code/languages'
import { splitLines } from '../model/file-text'
import type { DiffRow } from './parse-patch'

/** A row that shows a line of the old file, the new file, or both. */
type LineRow = Extract<DiffRow, { oldLine: number | null }>

interface Side {
  lines: readonly string[]
  tokens: readonly Token[][]
}

function sideOf(content: string | null, language: Language): Side | null {
  if (content === null) return null
  const lines = splitLines(content)
  return { lines, tokens: highlightLines(lines, language) }
}

/**
 * The tokens of a row from the whole file of its side, so that a block
 * comment or a string that opens above the hunk keeps its colour. Removed
 * lines read the old file. Added and context lines read the new file. A
 * row whose text differs from the file line, such as after a lone carriage
 * return, finds no tokens.
 */
function fileTokens(
  row: LineRow,
  oldSide: Side | null,
  newSide: Side | null,
): Token[] | null {
  const removed = row.kind === 'removed'
  const side = removed ? oldSide : newSide
  const line = removed ? row.oldLine : row.newLine
  if (!side || line === null || line < 1) return null
  if (side.lines[line - 1] !== row.text) return null
  return side.tokens[line - 1] ?? null
}

/**
 * The tokens of the rows from the diff text alone. Each hunk starts again
 * in code, and each side reads its own rows, so an added line does not
 * end a comment that a removed line opens. Context rows take the tokens of
 * the new side, as in `fileTokens`.
 */
function patchTokens(
  rows: readonly DiffRow[],
  language: Language,
): Map<number, Token[]> {
  const tokens = new Map<number, Token[]>()
  const sides = [
    { kind: 'added', indexes: [] as number[], texts: [] as string[] },
    { kind: 'removed', indexes: [] as number[], texts: [] as string[] },
  ]
  const flush = () => {
    for (const side of sides) {
      highlightLines(side.texts, language).forEach((line, index) => {
        if (!tokens.has(side.indexes[index]))
          tokens.set(side.indexes[index], line)
      })
      side.indexes = []
      side.texts = []
    }
  }
  rows.forEach((row, index) => {
    if (row.kind === 'hunk') flush()
    if (row.kind === 'hunk' || row.kind === 'note') return
    for (const side of sides) {
      if (row.kind !== 'context' && row.kind !== side.kind) continue
      side.indexes.push(index)
      side.texts.push(row.text)
    }
  })
  flush()
  return tokens
}

/**
 * Splits the text of each diff row into coloured tokens. Hunk and note
 * rows have no tokens. It reads the whole old and new files when the diff
 * has them, and the diff text for each row that they do not match. It
 * returns null without a language, and the rows then show as plain text.
 */
export function highlightDiff(
  rows: readonly DiffRow[],
  language: Language | null,
  oldContent: string | null,
  newContent: string | null,
): (Token[] | null)[] | null {
  if (!language) return null
  const oldSide = sideOf(oldContent, language)
  const newSide = sideOf(newContent, language)
  const result = rows.map((row) =>
    row.kind === 'hunk' || row.kind === 'note'
      ? null
      : fileTokens(row, oldSide, newSide),
  )
  const missed = rows.some(
    (row, index) =>
      row.kind !== 'hunk' && row.kind !== 'note' && result[index] === null,
  )
  if (!missed) return result
  const fallback = patchTokens(rows, language)
  return result.map((tokens, index) => tokens ?? fallback.get(index) ?? null)
}
