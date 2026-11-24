import { expect, test } from 'vitest'

import { convertCss } from './convert-css.ts'
import { renderDraft } from './draft.ts'

const file = 'src/demo/StatusText.module.css'

test('drafts a formatted module with sorted token lookups and drops fallbacks', async () => {
  const { classes = new Map() } = convertCss(
    file,
    '.status-label { font-family: var(--ui-font-mono); color: var(--ui-ink2, #fff); font-size: var(--ui-text-sm); border-radius: var(--ui-radius-md); }',
  )
  expect(await renderDraft(file, classes)).toBe(`/**
 * Draft from src/demo/StatusText.module.css.
 * The report of this run lists the rules that the draft leaves out.
 */
type Tokens = {
  readonly fontMono: string
  readonly ink2: string
  readonly radiusMd: number
  readonly textSm: number
}

export function statusTextStyles(t: Tokens) {
  return {
    'status-label': {
      fontFamily: t.fontMono,
      color: t.ink2,
      fontSize: t.textSm,
      borderRadius: t.radiusMd,
    },
  } as const
}
`)
})

test('inserts the row default after display and keeps an explicit direction', () => {
  const { classes, rowDefaults } = convertCss(
    file,
    '.a { display: flex; gap: 6px } .b { display: inline-flex; flex-flow: column } .c { display: flex; flex-flow: wrap }',
  )
  expect(rowDefaults).toBe(2)
  expect(
    [...(classes ?? [])].map(([name, style]) => [name, [...style]]),
  ).toEqual([
    [
      'a',
      [
        ['display', 'flex'],
        ['flexDirection', 'row'],
        ['gap', 6],
      ],
    ],
    [
      'b',
      [
        ['display', 'flex'],
        ['flexDirection', 'column'],
      ],
    ],
    [
      'c',
      [
        ['display', 'flex'],
        ['flexDirection', 'row'],
        ['flexWrap', 'wrap'],
      ],
    ],
  ])
})

test('merges shorthand and longhand declarations in source order before it collapses equal sides', () => {
  const { classes, converted } = convertCss(
    file,
    `.row {
      padding: 0 var(--ui-pad-x);
      gap: 4px 8px;
      inset: 1px 2px;
      border: none;
      border-top: 1px solid var(--ui-border);
      border-radius: 4px 8px;
      margin-inline: 2px 4px;
      margin-block: 3px;
    }
    .row {
      padding-top: 2px;
      padding-block: 2px;
      column-gap: 4px;
      inset: 1px;
      margin-right: 2px;
      border-top-left-radius: 8px;
      border-bottom-right-radius: 8px;
    }`,
  )
  expect(converted).toBe(15)
  expect([...(classes?.get('row') ?? [])]).toEqual([
    ['paddingVertical', 2],
    ['paddingHorizontal', { kind: 'token', name: 'padX' }],
    ['gap', 4],
    ['inset', 1],
    ['borderTopWidth', 1],
    ['borderRightWidth', 0],
    ['borderBottomWidth', 0],
    ['borderLeftWidth', 0],
    ['borderTopColor', { kind: 'token', name: 'border' }],
    ['borderRadius', 8],
    ['marginVertical', 3],
    ['marginHorizontal', 2],
  ])
})

test('expands explicit outline values and keeps a token inside each shadow string', () => {
  const { classes, listed } = convertCss(
    file,
    '.a { outline: 2px solid var(--ui-primary); box-shadow: 0 10px 28px var(--ui-shadow), inset 0 1px 3px transparent } .b { background: none; border: 0; text-decoration: line-through }',
  )
  expect(Object.fromEntries(classes?.get('a') ?? [])).toEqual({
    outlineWidth: 2,
    outlineColor: { kind: 'token', name: 'primary' },
    outlineStyle: 'solid',
    boxShadow: {
      kind: 'template',
      parts: [
        '0 10px 28px ',
        { kind: 'token', name: 'shadow' },
        ', inset 0 1px 3px transparent',
      ],
    },
  })
  expect(Object.fromEntries(classes?.get('b') ?? [])).toEqual({
    backgroundColor: 'transparent',
    borderWidth: 0,
    textDecorationLine: 'line-through',
  })
  expect(listed).toEqual([])
})

test('leaves out converted values that a listed declaration overrides in a plain class', () => {
  const { classes, checks, converted, rowDefaults } = convertCss(
    file,
    `.tabs, .mobileTabs {
  display: flex;
  max-width: 24px;
  padding: 4px;
}
.mobileTabs {
  padding-top: 3px;
  DISPLAY: grid;
  max-width: none;
  padding: 1em;
}
@media (width > 100px) { .tabs { display: grid } }
.tabs:hover { max-width: none }`,
  )
  expect(Object.fromEntries(classes?.get('mobileTabs') ?? [])).toEqual({})
  expect(Object.fromEntries(classes?.get('tabs') ?? [])).toEqual({
    display: 'flex',
    flexDirection: 'row',
    maxWidth: 24,
    padding: 4,
  })
  expect(converted).toBe(7)
  expect(rowDefaults).toBe(1)
  expect(checks).toEqual([
    {
      line: 8,
      selector: '.mobileTabs',
      text: 'DISPLAY: grid overrides display from display at line 2.',
    },
    {
      line: 9,
      selector: '.mobileTabs',
      text: 'max-width: none overrides maxWidth from max-width at line 3.',
    },
    {
      line: 10,
      selector: '.mobileTabs',
      text: 'padding: 1em overrides paddingTop from padding-top at line 7.',
    },
    {
      line: 10,
      selector: '.mobileTabs',
      text: 'padding: 1em overrides paddingRight, paddingBottom, paddingLeft from padding at line 4.',
    },
  ])
})

test('uses source text for exact numbers, comments and quoted delimiters', () => {
  const { classes, listed, converted } = convertCss(
    file,
    `/* 😀 */
    .a /* trailing comment */ {
      line-height: 13.123456789px;
      width: var(--ui-pad-x, calc(1em + 3px));
      font-family: 'Font;{},[]';
      color: var(/* ,;) */ --ui-ink, 'unused; ) }');
    }`,
  )
  expect(converted).toBe(4)
  expect(listed).toEqual([])
  expect(Object.fromEntries(classes?.get('a') ?? [])).toEqual({
    lineHeight: 13.123456789,
    width: { kind: 'token', name: 'padX' },
    fontFamily: 'Font;{},[]',
    color: { kind: 'token', name: 'ink' },
  })
})

test('keeps both the offset and colour token in the shadow string', () => {
  const { classes, listed } = convertCss(
    file,
    '.a { box-shadow: 0 var(--ui-shadow-offset) 4px var(--ui-shadow) }',
  )
  expect(classes?.get('a')?.get('boxShadow')).toEqual({
    kind: 'template',
    parts: [
      '0 ',
      { kind: 'token', name: 'shadowOffset' },
      ' 4px ',
      { kind: 'token', name: 'shadow' },
    ],
  })
  expect(listed).toEqual([])
})

test('records inline flex, important and the final text keys for manual checks', () => {
  const { checks, classes } = convertCss(
    file,
    `.a {
  display: inline-flex;
  color: var(--ui-ink) !important;
  font-size: 12px;
}
.a { color: transparent }`,
  )
  expect(classes?.get('a')?.get('color')).toEqual({
    kind: 'token',
    name: 'ink',
  })
  expect(checks).toEqual([
    {
      line: 2,
      selector: '.a',
      text: 'inline-flex became flex. Check the surrounding layout.',
    },
    {
      line: 3,
      selector: '.a',
      text: 'Dropped !important from color: var(--ui-ink). Check the order of styles.',
    },
    {
      line: 1,
      selector: '.a',
      text: 'React Native applies color, fontSize only to the Text that gets the style.',
    },
  ])
})

test('converts plain selectors in a list and accounts for each declaration per selector', () => {
  const { classes, converted, listed } = convertCss(
    file,
    '.one, .two, .one:hover { width: 10px; height: 2em }',
  )
  expect(converted).toBe(2)
  expect([...(classes?.keys() ?? [])]).toEqual(['one', 'two'])
  expect(listed).toEqual([
    {
      kind: 'declaration',
      selector: '.one',
      line: 1,
      text: 'height: 2em',
      reasons: ['em'],
    },
    {
      kind: 'declaration',
      selector: '.two',
      line: 1,
      text: 'height: 2em',
      reasons: ['em'],
    },
    {
      kind: 'rule',
      selector: '.one:hover',
      line: 1,
      reasons: ['hover'],
      declarations: [
        { line: 1, text: 'width: 10px', reasons: [] },
        { line: 1, text: 'height: 2em', reasons: ['em'] },
      ],
    },
  ])
  const count = listed.reduce(
    (total, item) =>
      total + (item.kind === 'rule' ? item.declarations.length : 1),
    converted,
  )
  expect(count).toBe(6)
})
