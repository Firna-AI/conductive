import type { Token } from 'markdown-it'
import { markdownParser, type ParsedMarkdown } from './parser'

/**
 * The parts that the adapters of the chat and of the file preview share to
 * read the block tokens of the parser: the depth limit of lists and quotes,
 * the source lines of a list or a quote, and the lines that the parser
 * drops. This module imports no React.
 */

/**
 * Lists and quotes nest at most this deep, in agent messages and in the
 * file preview. A deeper list or quote shows as the text of a paragraph.
 */
export const maxDepth = 16

/** A read of the block tokens of one parse, from the token at `index`. */
export interface TokenRead {
  readonly tokens: readonly Token[]
  /** The source lines of the parse, for the maps of the tokens. */
  readonly lines: readonly string[]
  index: number
  /** The source lines that the parser dropped, by the token after them. */
  readonly dropped: Map<number, string[]>
}

/** A read of a parse from its first token. */
export function tokenRead(parsed: ParsedMarkdown): TokenRead {
  const dropped = new Map<number, string[]>()
  for (const range of parsed.dropped) {
    const lines = parsed.lines.slice(...range.map)
    dropped.set(range.tokenIndex, [
      ...(dropped.get(range.tokenIndex) ?? []),
      ...lines,
    ])
  }
  return { tokens: parsed.tokens, lines: parsed.lines, index: 0, dropped }
}

/** The index of the token that closes the token at `at`. */
export function closeOf(tokens: readonly Token[], at: number): number {
  let open = 0
  for (let index = at; index < tokens.length; index += 1) {
    open += tokens[index].nesting
    if (open === 0) return index
  }
  return tokens.length - 1
}

/** Takes the source lines that the parser dropped before the token at `at`. */
export function takeDropped(read: TokenRead, at: number): readonly string[] {
  const lines = read.dropped.get(at)
  if (!lines) return []
  read.dropped.delete(at)
  return lines
}

/**
 * Passes the list or the quote at the index of the read, and gives its
 * source lines, with their list marks and their own quote marks. They also
 * hold each line that the parser dropped inside it.
 */
export function containerLines(read: TokenRead): readonly string[] {
  const open = read.tokens[read.index]
  const close = closeOf(read.tokens, read.index)
  for (const at of read.dropped.keys()) {
    if (at > read.index && at <= close) read.dropped.delete(at)
  }
  read.index = close + 1
  const [from, to] = open.map ?? [0, 0]
  return read.lines.slice(from, to)
}

/**
 * A source line without the `>` marks of the `quotes` quotes around its
 * block. A lazy line of a quote has no mark, so it stays as it is.
 */
export function unquoted(line: string, quotes: number): string {
  let rest = line
  for (let level = 0; level < quotes; level += 1) {
    const mark = /^\s*>/u.exec(rest)
    if (!mark) break
    rest = rest.slice(mark[0].length)
  }
  return rest
}

/**
 * The inline tokens of source lines that a view shows as the text of one
 * paragraph, such as the lines of a list past the depth limit. The lines
 * keep their list marks and their own quote marks, so no text is lost.
 * Null when the lines hold no text.
 */
export function linesInline(
  lines: readonly string[],
  quotes: number,
): Token[] | null {
  const source = lines
    .map((line) => unquoted(line, quotes).trim())
    .filter((line) => line !== '')
    .join('\n')
  if (source === '') return null
  const [inline] = markdownParser.parseInline(source, {})
  return inline?.children ?? null
}
