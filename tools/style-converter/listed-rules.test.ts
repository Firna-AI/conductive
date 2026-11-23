import { expect, test } from 'vitest'

import { convertCss } from './convert-css.ts'
import type { Reason } from './reasons.ts'

const file = 'src/demo/Example.module.css'

const declarations: [string, Reason[]][] = [
  ['display: inline-grid', ['grid']],
  ['grid-template-columns: repeat(3, minmax(0, 1fr))', ['grid']],
  ['width: calc(100% - 1em)', ['calculation', 'em']],
  ['height: min(2rem, 100dvh)', ['calculation', 'rem', 'unit']],
  ['line-height: 1.3', ['lineHeight']],
  ['--ui-ink: blue', ['customProperty']],
  ['padding: var(--local, 4px)', ['localVariable']],
  ['background: url("dots;}.svg")', ['cssFunction']],
  ['width: inherit', ['cssKeyword']],
  ['font-family: Inter, sans-serif', ['parseValue']],
  ['font-family: var(--ui-font-mono) Fallback', ['parseValue']],
  ['white-space: nowrap', ['property']],
  ['position: fixed', ['nativeValue']],
  ['font-size: 75%', ['nativeValue']],
  ['display: var(--ui-mode)', ['tokenType']],
  ['padding: -2px', ['nativeValue']],
  ['border-color: #0ff', ['fixedColor']],
  ['background: rebeccapurple', ['fixedColor']],
  ['box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.18)', ['fixedColor']],
  ['color: currentColor', ['currentColor']],
  ['color: bogus', ['colorValue']],
  ['border-bottom: 1px dotted var(--ui-border)', ['sideBorderStyle']],
  ['border-top: 1px dashed #fff', ['sideBorderStyle', 'fixedColor']],
  ['border-right: 4px solid', ['shorthandDefault']],
]

test.each(declarations)(
  'lists %s on its source line and leaves it out of the draft',
  (declaration, reasons) => {
    const result = convertCss(
      file,
      `.a {\n  opacity: 0.5;\n  ${declaration};\n}`,
    )
    expect(result.listed).toEqual([
      {
        kind: 'declaration',
        line: 3,
        selector: '.a',
        text: declaration,
        reasons,
      },
    ])
    expect(Object.fromEntries(result.classes?.get('a') ?? [])).toEqual({
      opacity: 0.5,
    })
  },
)

const selectors: [string, Reason[]][] = [
  ['.a .b', ['combinator']],
  ['.a>span', ['combinator', 'element']],
  ['.a + .b ~ .c', ['combinator']],
  ['*', ['element']],
  ['.a:hover', ['hover']],
  ['.a:focus-within:focus-visible:focus', ['focus']],
  ['.a:disabled', ['pseudoClass']],
  ['.a:not(.b):is(span, .c:hover)', ['pseudoClass', 'element', 'hover']],
  ['.a::before', ['pseudoElement']],
  ['.a[data-on="x,y"]', ['attribute']],
  ['.a.b#item', ['compound']],
  [':global(.a > span:hover)', ['global', 'combinator', 'element', 'hover']],
]

test.each(selectors)(
  'lists %s with the rule declarations and leaves it out of the draft',
  (selector, reasons) => {
    const result = convertCss(
      file,
      `/* Row */\n${selector} {\n  height: 12px;\n}`,
    )
    expect(result.listed).toEqual([
      {
        kind: 'rule',
        line: 2,
        selector,
        reasons,
        declarations: [{ line: 3, text: 'height: 12px', reasons: [] }],
      },
    ])
    expect([...(result.classes ?? [])]).toEqual([])
  },
)

const queries: [string, Reason][] = [
  ['@media (hover: hover)', 'media'],
  ['@container panel (width > 40px)', 'container'],
  ['@supports (display: grid)', 'supports'],
]

test.each(queries)(
  'lists each inner selector of %s with its reasons',
  (query, reason) => {
    const result = convertCss(
      file,
      `${query} {\n  .a:hover,\n  .b { height: 10px }\n}`,
    )
    expect(result.listed).toEqual([
      {
        kind: 'rule',
        line: 2,
        selector: `${query} › .a:hover`,
        reasons: [reason, 'hover'],
        declarations: [{ line: 3, text: 'height: 10px', reasons: [] }],
      },
      {
        kind: 'rule',
        line: 3,
        selector: `${query} › .b`,
        reasons: [reason],
        declarations: [{ line: 3, text: 'height: 10px', reasons: [] }],
      },
    ])
    expect([...(result.classes ?? [])]).toEqual([])
  },
)

test('lists each keyframes or other at-rule as one item with its source declarations', () => {
  const result = convertCss(
    file,
    `@keyframes fade {
  from, 50% { opacity: 0 }
  to { opacity: 1 }
}
@property --x { syntax: '<length>'; inherits: false; initial-value: 1px }
@import 'other.css';`,
  )
  expect(result.listed).toEqual([
    {
      kind: 'rule',
      line: 1,
      selector: '@keyframes fade',
      reasons: ['keyframes'],
      declarations: [
        { line: 2, text: 'opacity: 0', reasons: [] },
        { line: 2, text: 'opacity: 0', reasons: [] },
        { line: 3, text: 'opacity: 1', reasons: [] },
      ],
    },
    {
      kind: 'rule',
      line: 5,
      selector: '@property --x',
      reasons: ['atRule'],
      declarations: [
        { line: 5, text: "syntax: '<length>'", reasons: [] },
        { line: 5, text: 'inherits: false', reasons: [] },
        { line: 5, text: 'initial-value: 1px', reasons: [] },
      ],
    },
    {
      kind: 'rule',
      line: 6,
      selector: "@import 'other.css'",
      reasons: ['atRule'],
      declarations: [],
    },
  ])
  expect([...(result.classes ?? [])]).toEqual([])
})

test('lists the whole rule when parser recovery loses declarations', () => {
  const result = convertCss(
    file,
    '.a { height: 10px; bad; } .b { height: 12px }',
  )
  expect(result.listed).toMatchObject([
    {
      kind: 'rule',
      line: 1,
      selector: '.a',
      reasons: ['parseRule'],
      declarations: [{ line: 1, text: 'height: 10px', reasons: [] }],
    },
  ])
  expect(
    [...(result.classes ?? [])].map(([name, style]) => [name, [...style]]),
  ).toEqual([['b', [['height', 12]]]])
})

test('lists the declarations of a block with no selector', () => {
  const { listed, classes } = convertCss(
    file,
    '{ width: 10px; color: transparent }',
  )
  expect(listed).toMatchObject([
    {
      kind: 'rule',
      line: 1,
      selector: '(empty selector)',
      reasons: ['parseRule'],
      declarations: [
        { line: 1, text: 'width: 10px' },
        { line: 1, text: 'color: transparent' },
      ],
    },
  ])
  expect([...(classes ?? [])]).toEqual([])
})

test('keeps nested declarations and selectors in the report', () => {
  const { listed, classes } = convertCss(
    file,
    '.a { width: 4px; & .b { height: 1px } color: transparent; }',
  )
  expect(listed).toEqual([
    {
      kind: 'rule',
      line: 1,
      selector: '.a › & .b',
      reasons: ['nesting', 'combinator'],
      declarations: [{ line: 1, text: 'height: 1px', reasons: [] }],
    },
    {
      kind: 'rule',
      line: 1,
      selector: '.a',
      reasons: ['nesting'],
      declarations: [{ line: 1, text: 'color: transparent', reasons: [] }],
    },
  ])
  expect(Object.fromEntries(classes?.get('a') ?? [])).toEqual({ width: 4 })
})

test('lists a file that Lightning CSS cannot read with its error and skips its draft', () => {
  const result = convertCss(file, '.a.b { composes: other; width: 3px }')
  expect(result.draft).toBe(false)
  expect(result.listed).toMatchObject([
    {
      kind: 'rule',
      line: 1,
      reasons: ['parseFile'],
      detail: expect.stringContaining('composes'),
      declarations: [
        { line: 1, text: 'composes: other' },
        { line: 1, text: 'width: 3px' },
      ],
    },
  ])
})

test('lists a token use whose type conflicts with its first use', () => {
  const result = convertCss(
    file,
    '.a { color: var(--ui-x); width: var(--ui-x) }',
  )
  expect(result.listed).toEqual([
    {
      kind: 'declaration',
      line: 1,
      selector: '.a',
      text: 'width: var(--ui-x)',
      reasons: ['tokenType'],
    },
  ])
  expect(Object.fromEntries(result.classes?.get('a') ?? [])).toEqual({
    color: { kind: 'token', name: 'x' },
  })
})

test('lists a solid side border that would use an earlier dashed border style', () => {
  const { listed, classes } = convertCss(
    file,
    '.a { border: 1px dashed transparent; border-top: 2px solid var(--ui-border); }',
  )
  expect(listed).toEqual([
    {
      kind: 'declaration',
      line: 1,
      selector: '.a',
      text: 'border-top: 2px solid var(--ui-border)',
      reasons: ['sideBorderStyle'],
    },
  ])
  expect(Object.fromEntries(classes?.get('a') ?? [])).toEqual({
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    borderStyle: 'dashed',
  })
})
