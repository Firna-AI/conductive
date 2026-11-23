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
