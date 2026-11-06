/** Line tests that the block parser and the list parser share. */

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

/** The opening fence of a code block, such as ```` ```ts ```` or `~~~`. */
export function openingFence(
  line: string,
): { marker: string; indent: number } | null {
  const match = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line)
  if (!match) return null
  const [, pad, marker, info] = match
  if (marker[0] === '`' && info.includes('`')) return null
  return { marker, indent: pad.length }
}

export function closesFence(line: string, marker: string): boolean {
  const match = /^ {0,3}(`{3,}|~{3,})[ ]*$/.exec(line)
  return (
    match !== null &&
    match[1][0] === marker[0] &&
    match[1].length >= marker.length
  )
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
