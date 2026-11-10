/** Line tests that the Markdown readers of the chat and the file preview share. */

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
export function expandTabs(line: string): string {
  if (!line.includes('\t')) return line
  let expanded = ''
  for (const char of line) {
    expanded += char === '\t' ? ' '.repeat(4 - (expanded.length % 4)) : char
  }
  return expanded
}
