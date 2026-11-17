import { linesInline } from '../../markdown/token-read'
import { inlineText, type InlineText } from './agent-inline'

/**
 * Source lines that the chat shows as the text of one paragraph, such as
 * lines past the nesting limit, with their inline Markdown. The lines keep
 * their list marks and their own quote marks, so no text is lost. The
 * marks of the `quotes` quotes around the lines do not show.
 */
export function linesText(
  lines: readonly string[],
  quotes: number,
): InlineText {
  return inlineText(linesInline(lines, quotes, { chat: true }))
}
