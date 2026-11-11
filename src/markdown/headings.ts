/** The six heading levels of Markdown. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

const headingLevels: readonly HeadingLevel[] = [1, 2, 3, 4, 5, 6]

/**
 * The text of a hash heading without its closing hash run and the spaces
 * around that run. The run closes only after a space or at the start.
 * Reads backward once through the text.
 */
function withoutClosingHashes(text: string): string {
  let end = text.length
  while (end > 0 && text[end - 1] === ' ') end -= 1
  let start = end
  while (start > 0 && text[start - 1] === '#') start -= 1
  if (start === end) return text
  if (start === 0) return ''
  if (text[start - 1] !== ' ') return text
  while (start > 0 && text[start - 1] === ' ') start -= 1
  return text.slice(0, start)
}

/** A hash heading with its level and trimmed text, or null for another line. */
export function atxHeading(
  line: string,
): { level: HeadingLevel; text: string } | null {
  const heading = /^ {0,3}(#{1,6})(?:[ ]+|$)(.*)$/.exec(line)
  if (!heading) return null
  return {
    level: headingLevels[heading[1].length - 1],
    text: withoutClosingHashes(heading[2]).trim(),
  }
}

/** The heading level of an underline of equals signs or hyphens, or null. */
export function setextLevel(line: string): 1 | 2 | null {
  const underline = /^ {0,3}(=+|-+)[ ]*$/.exec(line)
  if (!underline) return null
  return underline[1][0] === '=' ? 1 : 2
}
