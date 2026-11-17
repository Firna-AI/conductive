import { markdownParser } from '../../markdown/parser'
import { inlineText, type InlineText } from './agent-inline'

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
 * Source lines that the chat shows as the text of one paragraph, such as
 * lines past the nesting limit, with their inline Markdown. The lines keep
 * their list marks and their own quote marks, so no text is lost.
 */
export function linesText(
  lines: readonly string[],
  quotes: number,
): InlineText {
  const source = lines
    .map((line) => unquoted(line, quotes).trim())
    .filter((line) => line !== '')
    .join('\n')
  if (source === '') return []
  const [inline] = markdownParser.parseInline(source, {})
  return inlineText(inline?.children ?? null)
}
