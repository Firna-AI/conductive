/** A small TypeScript highlighter for the code preview mockups. */

export type TokenKind =
  'keyword' | 'string' | 'comment' | 'number' | 'type' | 'plain'

export type Token = { kind: TokenKind; text: string }

const keywords = new Set([
  'async',
  'await',
  'const',
  'else',
  'export',
  'false',
  'from',
  'function',
  'if',
  'import',
  'let',
  'new',
  'null',
  'return',
  'true',
  'type',
])

const pattern =
  /(\/\/.*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|(\b\d+\b)|([A-Za-z_$][\w$]*)/g

function kindOf(match: RegExpMatchArray): TokenKind {
  const [, comment, text, number, word] = match
  if (comment) return 'comment'
  if (text) return 'string'
  if (number) return 'number'
  if (word && keywords.has(word)) return 'keyword'
  if (word && /^[A-Z]/.test(word)) return 'type'
  return 'plain'
}

/** Splits one line of code into coloured tokens. */
export function highlightLine(line: string): Token[] {
  const tokens: Token[] = []
  let last = 0
  for (const match of line.matchAll(pattern)) {
    const start = match.index ?? 0
    if (start > last)
      tokens.push({ kind: 'plain', text: line.slice(last, start) })
    tokens.push({ kind: kindOf(match), text: match[0] })
    last = start + match[0].length
  }
  if (last < line.length) tokens.push({ kind: 'plain', text: line.slice(last) })
  return tokens
}
