import { expect, test } from 'vitest'

import { convertCss } from './convert-css.ts'

const file = 'src/demo/Final.module.css'

test('a token use before a later replacement reads the type it needs', () => {
  const { classes, listed } = convertCss(
    file,
    `.a { width: var(--ui-pad-x) }
.b { box-shadow: 0 var(--ui-pad-x) 4px transparent }
.a { width: 12px }`,
  )
  expect(listed).toEqual([])
  expect(classes?.get('a')?.get('width')).toBe(12)
  expect(classes?.get('b')?.get('boxShadow')).toEqual({
    kind: 'template',
    parts: ['0 ', { kind: 'token', name: 'padX' }, ' 4px transparent'],
  })
})

test('a token use that loses to an important value cannot block a later use', () => {
  const { classes, listed } = convertCss(
    file,
    `.a { width: 12px !important; width: var(--ui-pad-x) }
.b { box-shadow: 0 var(--ui-pad-x) 4px transparent }`,
  )
  expect(listed).toEqual([])
  expect(classes?.get('a')?.get('width')).toBe(12)
  expect(classes?.get('b')?.get('boxShadow')).toEqual({
    kind: 'template',
    parts: ['0 ', { kind: 'token', name: 'padX' }, ' 4px transparent'],
  })
})

test('a side border converts when all final styles are solid', () => {
  const { classes, listed } = convertCss(
    file,
    `.row {
  border: 1px dashed transparent;
  border-top: 2px solid var(--ui-line);
  border-style: solid;
}`,
  )
  expect(listed).toEqual([])
  expect(Object.fromEntries(classes?.get('row') ?? [])).toEqual({
    borderTopWidth: 2,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: { kind: 'token', name: 'line' },
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    borderStyle: 'solid',
  })
})

test('a later shared style replaces the dotted style of a side shorthand', () => {
  const { classes, listed } = convertCss(
    file,
    '.row { border-top: 2px dotted transparent; border-style: solid }',
  )
  expect(listed).toEqual([])
  expect(Object.fromEntries(classes?.get('row') ?? [])).toEqual({
    borderTopWidth: 2,
    borderTopColor: 'transparent',
    borderStyle: 'solid',
  })
})
