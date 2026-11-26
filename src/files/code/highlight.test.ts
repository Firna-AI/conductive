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

it('colours Rust code after a raw string with an inner quote', () => {
  const tokens = highlightLines(
    [`let pattern = r#"['"]"#;`, 'let ready = true;'],
    languageOf('lib.rs'),
  )
  expect(
    tokens.map((line) => line.filter(({ kind }) => kind !== 'plain')),
  ).toEqual([
    [
      { kind: 'keyword', text: 'let' },
      { kind: 'string', text: `r#"['"]"#` },
    ],
    [
      { kind: 'keyword', text: 'let' },
      { kind: 'keyword', text: 'true' },
    ],
  ])
})

it.each([
  {
    name: 'closes a Rust raw string at a quote after a backslash',
    literal: String.raw`r"a\"`,
  },
  {
    name: 'keeps a quote with too few hashes in the Rust raw string',
    literal: 'r##"a "# b"##',
  },
  {
    name: 'colours the full Rust raw byte string',
    literal: 'br"hello"',
  },
  {
    name: 'colours the full Rust raw C string',
    literal: 'cr#"hello"#',
  },
])('$name', ({ literal }) => {
  const [tokens] = highlightLines(
    [`${literal}; let ready = true;`],
    languageOf('lib.rs'),
  )
  expect(tokens.filter(({ kind }) => kind !== 'plain')).toEqual([
    { kind: 'string', text: literal },
    { kind: 'keyword', text: 'let' },
    { kind: 'keyword', text: 'true' },
  ])
})

it('carries the closer of a Rust raw string across lines', () => {
  const tokens = highlightLines(
    [
      'let text = r#"',
      String.raw`an "inner quote" and a slash \"#; let ready = true;`,
    ],
    languageOf('lib.rs'),
  )
  expect(
    tokens.map((line) => line.filter(({ kind }) => kind !== 'plain')),
  ).toEqual([
    [
      { kind: 'keyword', text: 'let' },
      { kind: 'string', text: 'r#"' },
    ],
    [
      { kind: 'string', text: String.raw`an "inner quote" and a slash \"#` },
      { kind: 'keyword', text: 'let' },
      { kind: 'keyword', text: 'true' },
    ],
  ])
})

it('honours escapes in Rust byte, C, and multi-line ordinary strings', () => {
  const tokens = highlightLines(
    [
      String.raw`b"\n"; c"\""; "first`,
      String.raw`\"second"; let ready = true;`,
    ],
    languageOf('lib.rs'),
  )
  expect(
    tokens.map((line) => line.filter(({ kind }) => kind !== 'plain')),
  ).toEqual([
    [
      { kind: 'string', text: String.raw`b"\n"` },
      { kind: 'string', text: String.raw`c"\""` },
      { kind: 'string', text: '"first' },
    ],
    [
      { kind: 'string', text: String.raw`\"second"` },
      { kind: 'keyword', text: 'let' },
      { kind: 'keyword', text: 'true' },
    ],
  ])
})

it('keeps Rust raw identifiers plain', () => {
  const [tokens] = highlightLines(
    ['let r#type = r#étrue;'],
    languageOf('lib.rs'),
  )
  expect(tokens).toEqual([
    { kind: 'keyword', text: 'let' },
    { kind: 'plain', text: ' r#type = r#étrue;' },
  ])
})
