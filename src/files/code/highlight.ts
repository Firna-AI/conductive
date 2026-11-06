import type { Language } from './languages'

export type TokenKind =
  'keyword' | 'string' | 'comment' | 'number' | 'type' | 'plain'

export interface Token {
  kind: TokenKind
  text: string
}

type Mode =
  | { kind: 'code' }
  | { kind: 'comment'; close: string }
  | { kind: 'string'; close: string; multiline: boolean }

const code: Mode = { kind: 'code' }
const numberToken =
  /0[xX][\da-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?/y
const wordToken = /[A-Za-z_$][\w$]*/y

/** The index of `close` from `from`, skipping characters after a backslash. */
function closeAt(line: string, close: string, from: number): number {
  for (let index = from; index < line.length; index += 1) {
    if (line[index] === '\\') index += 1
    else if (line.startsWith(close, index)) return index
  }
  return -1
}

function wordKind(word: string, language: Language): TokenKind {
  const key = language.anyCase ? word.toLowerCase() : word
  if (language.keywords.has(key)) return 'keyword'
  return language.capitalTypes && /^[A-Z]/.test(word) ? 'type' : 'plain'
}

/**
 * Splits the lines of a file into coloured tokens. A block comment or a
 * multi-line string carries on to the next lines. Without a language, each
 * line is one plain token.
 */
export function highlightLines(
  lines: readonly string[],
  language: Language | null,
): Token[][] {
  if (!language) {
    return lines.map((line) => (line ? [{ kind: 'plain', text: line }] : []))
  }
  let mode: Mode = code
  return lines.map((line) => {
    const tokens: Token[] = []
    const add = (kind: TokenKind, text: string) => {
      const last = tokens[tokens.length - 1]
      if (last?.kind === kind) last.text += text
      else if (text) tokens.push({ kind, text })
    }
    let index = 0
    while (index < line.length) {
      if (mode.kind !== 'code') {
        const kind = mode.kind
        const end =
          kind === 'comment'
            ? line.indexOf(mode.close, index)
            : closeAt(line, mode.close, index)
        if (end < 0) {
          add(kind, line.slice(index))
          break
        }
        add(kind, line.slice(index, end + mode.close.length))
        index = end + mode.close.length
        mode = code
        continue
      }
      if (language.lineComments.some((mark) => line.startsWith(mark, index))) {
        add('comment', line.slice(index))
        break
      }
      const block = language.blockComments.find(([open]) =>
        line.startsWith(open, index),
      )
      if (block) {
        add('comment', block[0])
        index += block[0].length
        mode = { kind: 'comment', close: block[1] }
        continue
      }
      const string = language.strings.find((rule) =>
        line.startsWith(rule.open, index),
      )
      if (string) {
        add('string', string.open)
        index += string.open.length
        mode = { kind: 'string', ...string }
        continue
      }
      const pattern = /\d/.test(line[index]) ? numberToken : wordToken
      pattern.lastIndex = index
      const match = /[\w$]/.test(line[index - 1] ?? '')
        ? null
        : pattern.exec(line)
      if (match) {
        const kind =
          pattern === numberToken ? 'number' : wordKind(match[0], language)
        add(kind, match[0])
        index += match[0].length
        continue
      }
      add('plain', line[index])
      index += 1
    }
    if (mode.kind === 'string' && !mode.multiline) mode = code
    return tokens
  })
}
