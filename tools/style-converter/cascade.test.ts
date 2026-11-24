import { expect, test } from 'vitest'

import { convertCss } from './convert-css.ts'

const file = 'src/demo/Cascade.module.css'

test('a listed side removes the corresponding value of a converted shorthand and keeps the other sides', () => {
  const { classes, checks } = convertCss(
    file,
    '.row { padding: 8px }\n.row { padding-left: 1em }',
  )
  expect(Object.fromEntries(classes?.get('row') ?? [])).toEqual({
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
  })
  expect(checks).toEqual([
    {
      line: 2,
      selector: '.row',
      text: 'padding-left: 1em overrides paddingLeft from padding at line 1. The draft keeps the other values from that declaration.',
    },
  ])
})

test('a converted shorthand reports that an earlier listed side no longer applies', () => {
  const { classes, checks } = convertCss(
    file,
    '.row { padding-top: 1em }\n.row { padding: 4px }',
  )
  expect(Object.fromEntries(classes?.get('row') ?? [])).toEqual({ padding: 4 })
  expect(checks).toEqual([
    {
      line: 2,
      selector: '.row',
      text: 'padding: 4px overrides paddingTop from padding-top at line 1. The listed declaration no longer applies.',
    },
  ])
})

test('normal declarations keep important keys and later important declarations replace them', () => {
  const { classes } = convertCss(
    file,
    `.protected { display: flex !important }
.protected { display: grid }
.updated { padding: 4px !important }
.updated { padding-top: 8px !important; padding-left: 1em !important }
.updated { padding-left: 9px }`,
  )
  expect(Object.fromEntries(classes?.get('protected') ?? [])).toEqual({
    display: 'flex',
    flexDirection: 'row',
  })
  expect(Object.fromEntries(classes?.get('updated') ?? [])).toEqual({
    paddingTop: 8,
    paddingRight: 4,
    paddingBottom: 4,
  })
})

test('a font size replaces only one longhand of a listed font shorthand', () => {
  const { classes, checks } = convertCss(
    file,
    '.label { font: inherit }\n.label { font-size: 12px }',
  )
  expect(Object.fromEntries(classes?.get('label') ?? [])).toEqual({
    fontSize: 12,
  })
  expect(checks).toContainEqual({
    line: 2,
    selector: '.label',
    text: 'font-size: 12px overrides fontSize from font at line 1. The listed declaration still applies to its other values.',
  })
})

test('a listed font shorthand removes an earlier font size', () => {
  const { classes, checks } = convertCss(
    file,
    '.label { font-size: 12px }\n.label { font: inherit }',
  )
  expect(Object.fromEntries(classes?.get('label') ?? [])).toEqual({})
  expect(checks).toEqual([
    {
      line: 2,
      selector: '.label',
      text: 'font: inherit overrides fontSize from font-size at line 1.',
    },
  ])
})

test('a listed place-items removes align-items and keeps the other layout values', () => {
  const { classes, checks } = convertCss(
    file,
    '.row { align-items: flex-start; justify-content: center }\n.row { place-items: center }',
  )
  expect(Object.fromEntries(classes?.get('row') ?? [])).toEqual({
    justifyContent: 'center',
  })
  expect(checks).toEqual([
    {
      line: 2,
      selector: '.row',
      text: 'place-items: center overrides alignItems from align-items at line 1.',
    },
  ])
})

test('overflow replaces the listed value of one axis', () => {
  const { classes, checks } = convertCss(
    file,
    '.row { overflow-y: auto }\n.row { overflow: hidden }',
  )
  expect(Object.fromEntries(classes?.get('row') ?? [])).toEqual({
    overflow: 'hidden',
  })
  expect(checks).toEqual([
    {
      line: 2,
      selector: '.row',
      text: 'overflow: hidden overrides overflow from overflow-y at line 1. The listed declaration no longer applies.',
    },
  ])
})

test('different winning overflow axes leave one report item for each source', () => {
  const { classes, listed } = convertCss(
    file,
    '.row { overflow: hidden }\n.row { overflow-y: scroll }',
  )
  expect(Object.fromEntries(classes?.get('row') ?? [])).toEqual({})
  expect(listed).toEqual([
    {
      kind: 'declaration',
      line: 1,
      selector: '.row',
      text: 'overflow: hidden',
      reasons: ['overflowAxes'],
    },
    {
      kind: 'declaration',
      line: 2,
      selector: '.row',
      text: 'overflow-y: scroll',
      reasons: ['overflowAxes'],
    },
  ])
})

test('border replaces a listed border-top-style', () => {
  const { classes, checks } = convertCss(
    file,
    '.row { border-top-style: dashed }\n.row { border: 1px solid transparent }',
  )
  expect(Object.fromEntries(classes?.get('row') ?? [])).toEqual({
    borderWidth: 1,
    borderColor: 'transparent',
    borderStyle: 'solid',
  })
  expect(checks).toEqual([
    {
      line: 2,
      selector: '.row',
      text: 'border: 1px solid transparent overrides borderStyle from border-top-style at line 1. The listed declaration no longer applies.',
    },
  ])
})

test('a listed block-end border replaces only the bottom border values', () => {
  const { classes, checks } = convertCss(
    file,
    '.row { border-top-width: 1px; border-bottom-width: 2px }\n.row { border-block-end: 1em solid transparent }',
  )
  expect(Object.fromEntries(classes?.get('row') ?? [])).toEqual({
    borderTopWidth: 1,
  })
  expect(checks).toEqual([
    {
      line: 2,
      selector: '.row',
      text: 'border-block-end: 1em solid transparent overrides borderBottomWidth from border-bottom-width at line 1.',
    },
  ])
})

test('an important top border and a dashed border have no shared style', () => {
  const { classes, listed } = convertCss(
    file,
    '.row { border-top: 2px solid var(--ui-line) !important }\n.row { border: 1px dashed transparent; width: 20px }',
  )
  expect(Object.fromEntries(classes?.get('row') ?? [])).toEqual({ width: 20 })
  expect(listed).toEqual([
    {
      kind: 'declaration',
      line: 1,
      selector: '.row',
      text: 'border-top: 2px solid var(--ui-line) !important',
      reasons: ['sideBorderStyle'],
    },
    {
      kind: 'declaration',
      line: 2,
      selector: '.row',
      text: 'border: 1px dashed transparent',
      reasons: ['sideBorderStyle'],
    },
  ])
})
