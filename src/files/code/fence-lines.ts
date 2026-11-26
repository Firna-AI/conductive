import { languageOfLabel } from './fence-languages'
import { highlightLines, type Token } from './highlight'

/**
 * The coloured tokens of each line of a code block whose fence label is
 * `label`, with the colours of a file tab of its language. The text splits
 * at each line feed, so the lines with a line feed between two of them give
 * the text again, character for character. Null when the label names no
 * language, so the block shows plain text. The tokens are plain data, so
 * the Markdown worker can post them to the page.
 */
export function fenceLines(
  text: string,
  label: string | null,
): Token[][] | null {
  const language = languageOfLabel(label)
  return language === null ? null : highlightLines(text.split('\n'), language)
}
