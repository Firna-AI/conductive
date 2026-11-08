import { describe, expect, it } from 'vitest'
import { literalParts } from './LiteralText'

describe('literalParts', () => {
  it('keeps tabs and spaces as text, and marks each line feed and each other hidden character by its code point', () => {
    const text =
      'a\tb  c\nd\u00A0e\u2028f\u200Bg\u202Eh\uFEFFi\u001Bj\rk\u3164l\u2800m\u034Fn\u{E0041}o'
    const parts = literalParts(text)
    expect(
      parts.map((part) =>
        part.kind === 'text' ? part.text : `[${part.code}]`,
      ),
    ).toEqual([
      'a\tb  c',
      '[U+000A]',
      'd',
      '[U+00A0]',
      'e',
      '[U+2028]',
      'f',
      '[U+200B]',
      'g',
      '[U+202E]',
      'h',
      '[U+FEFF]',
      'i',
      '[U+001B]',
      'j',
      '[U+000D]',
      'k',
      '[U+3164]',
      'l',
      '[U+2800]',
      'm',
      '[U+034F]',
      'n',
      '[U+E0041]',
      'o',
    ])
    const joined = parts
      .map((part) => (part.kind === 'text' ? part.text : part.char))
      .join('')
    expect(joined).toBe(text)
  })
})
