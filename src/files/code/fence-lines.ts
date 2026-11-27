import { languageOfLabel } from './fence-languages'
import { highlightLines, type Token } from './highlight'

/**
 * The longest code block, in UTF-16 code units, that shows colours. A
 * longer block shows plain text, so a huge or crafted block draws one text
 * node, not millions of coloured spans, in the chat and in the preview.
 */
export const maxColouredLength = 200_000

/**
 * The coloured tokens of each line of a code block whose fence label is
 * `label`, with the colours of a file tab of its language. The text splits
 * at each line feed, so the lines with a line feed between two of them give
 * the text again, character for character. Null when the label names no
 * language, or when the text is longer than `maxColouredLength`, so the
 * block shows plain text. The tokens are plain data, so
 * the Markdown worker can post them to the page.
 */
export function fenceLines(
  text: string,
  label: string | null,
): Token[][] | null {
  const language = languageOfLabel(label)
  if (language === null || text.length > maxColouredLength) return null
  return highlightLines(text.split('\n'), language)
}
