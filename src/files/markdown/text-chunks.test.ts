import { expect, it } from 'vitest'
import { textChunks } from './text-chunks'

/** The grapheme ends of a text, from one pass of the platform segmenter. */
function graphemeEnds(text: string): Set<number> {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
  const ends = [...segmenter.segment(text)].map(
    (segment) => segment.index + segment.segment.length,
  )
  return new Set(ends)
}

it('splits a long run without spaces into parts that end only between whole graphemes', () => {
  // A family and a flag, a skin tone, a combining accent, Hangul jamo, a
  // conjunct, and a surrogate pair. The odd length moves each part end.
  const unit =
    'a\u{1F469}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}b\u{1F1EB}\u{1F1F7}' +
    'c\u{1F44D}\u{1F3FD}de\u0301f\u1100\u1161\u11A8g\u0915\u094D\u0937' +
    'h\u{1D4B3}ijk'
  // The run starts with an accent that joins the space before it. The last
  // run is one grapheme of a letter and 3,000 accents, longer than a part.
  const text =
    'Lead \u0301' +
    unit.repeat(2_000) +
    ' and o' +
    '\u0301'.repeat(3_000) +
    ' end'
  const parts = textChunks(text)
  expect(parts.join('')).toBe(text)
  expect(parts.length).toBeGreaterThan(1)
  const ends = graphemeEnds(text)
  let offset = 0
  for (const part of parts) {
    offset += part.length
    expect(part.length, `the part that ends at ${offset}`).toBeGreaterThan(0)
    expect(ends.has(offset), `a part ends at ${offset}`).toBe(true)
  }
})

it('keeps text with spaces in one part, so its glyphs keep their places', () => {
  const prose = 'Each agent reads the files of its branch.\n'.repeat(60)
  expect(textChunks(prose)).toEqual([prose])
  expect(textChunks('A short line.')).toEqual(['A short line.'])
})
