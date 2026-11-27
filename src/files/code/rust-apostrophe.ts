export interface ApostropheToken {
  kind: 'plain' | 'string'
  end: number
}

const charLiteral = /'(?:[^'\\\t\n\r]|\\(?:[nrt0'"\\]|x[\da-fA-F]{2}))'/uy
const lifetime = /'(?:r#)?[\p{XID_Start}_]\p{XID_Continue}*/uy
const unicodeEscape = "'\\u{"
const hexDigit = /[\da-f]/iu

function matchEnd(pattern: RegExp, line: string, start: number): number {
  pattern.lastIndex = start
  return pattern.test(line) ? pattern.lastIndex : -1
}

function unicodeCharEnd(line: string, start: number): number {
  if (!hexDigit.test(line[start] ?? '')) return -1
  let digits = 0
  let end = start
  for (; end < line.length; end += 1) {
    const char = line[end]
    if (char === '_') continue
    if (!hexDigit.test(char)) break
    digits += 1
    if (digits > 6) return -1
  }
  return line.startsWith("}'", end) ? end + 2 : -1
}

/** A quoted character is a string. A lifetime ends with its identifier. */
export function rustApostrophe(
  line: string,
  start: number,
): ApostropheToken | null {
  const charEnd = line.startsWith(unicodeEscape, start)
    ? unicodeCharEnd(line, start + unicodeEscape.length)
    : matchEnd(charLiteral, line, start)
  if (charEnd !== -1) return { kind: 'string', end: charEnd }
  const lifetimeEnd = matchEnd(lifetime, line, start)
  return lifetimeEnd < 0 ? null : { kind: 'plain', end: lifetimeEnd }
}
