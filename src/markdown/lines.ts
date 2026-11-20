/** Line readers and tests that the chat and the file preview share. */

/** Splits each CommonMark line ending, with raw and tab-expanded lines. */
export function markdownLines(text: string): {
  raw: string[]
  expanded: string[]
} {
  const raw = text.split(/\r\n|\n|\r/)
  return { raw, expanded: raw.map(expandTabs) }
}

export function isBlank(line: string): boolean {
  return line.trim() === ''
}

export function indentOf(line: string): number {
  return line.length - line.trimStart().length
}

/** A thematic break, such as `---`, `***`, or `_ _ _`. */
export function isRule(line: string): boolean {
  return /^ {0,3}([-*_])(?:[ ]*\1){2,}[ ]*$/.test(line)
}

/** Replaces each tab with the spaces up to the next stop of four columns. */
function expandTabs(line: string): string {
  if (!line.includes('\t')) return line
  let expanded = ''
  for (const char of line) {
    expanded += char === '\t' ? ' '.repeat(4 - (expanded.length % 4)) : char
  }
  return expanded
}
