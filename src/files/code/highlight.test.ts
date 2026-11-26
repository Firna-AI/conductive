import { expect, it } from 'vitest'
import { highlightLines } from './highlight'
import { languageOf } from './languages'

it('uses Rust keywords in Rust file tabs', () => {
  const [tokens] = highlightLines(
    [
      'as async await crate dyn fn impl Self unsafe yield new null this default',
    ],
    languageOf('lib.rs'),
  )
  expect(
    tokens.filter(({ kind }) => kind === 'keyword').map(({ text }) => text),
  ).toEqual([
    'as',
    'async',
    'await',
    'crate',
    'dyn',
    'fn',
    'impl',
    'Self',
    'unsafe',
    'yield',
  ])
})

it('keeps Rust lifetimes plain and colours character literals as strings', () => {
  const lines = [
    "impl<'a> Tool for Weather<'a> {",
    "    fn read(input: &'static str) {",
    String.raw`        let chars = ['x', '\n', '\'', '\u{1F600}', '\x41', '\u{1_F600}', '🦀'];`,
    String.raw`        let byte = b'\xFF';`,
    "        'outer: loop { break 'outer; }",
  ]
  const tokens = highlightLines(lines, languageOf('lib.rs'))
  expect(
    tokens.map((line) =>
      line.filter(({ kind }) => kind === 'string').map(({ text }) => text),
    ),
  ).toEqual([
    [],
    [],
    [
      "'x'",
      "'\\n'",
      "'\\''",
      "'\\u{1F600}'",
      "'\\x41'",
      "'\\u{1_F600}'",
      "'🦀'",
    ],
    ["'\\xFF'"],
    [],
  ])
  expect(
    tokens[1].filter(({ kind }) => kind === 'keyword').map(({ text }) => text),
  ).toEqual(['fn'])
  expect(tokens.map((line) => line.map(({ text }) => text).join(''))).toEqual(
    lines,
  )
})
