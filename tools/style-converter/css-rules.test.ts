import { expect, test } from 'vitest'

import { convertCss } from './convert-css.ts'

test('lists rules whose escaped property names or priorities disagree with the parser', () => {
  const result = convertCss(
    'src/demo/Escapes.module.css',
    String.raw`.priority { width: 4px !\69 mportant; width: 9px }
.name { width: 9px; \77 idth: 4px }
.bang { width: 4px \!important; width: 9px }`,
  )
  expect(result.listed).toMatchObject([
    {
      kind: 'rule',
      line: 1,
      selector: '.priority',
      reasons: ['parseRule'],
      declarations: [
        { line: 1, text: String.raw`width: 4px !\69 mportant` },
        { line: 1, text: 'width: 9px' },
      ],
    },
    {
      kind: 'rule',
      line: 2,
      selector: '.name',
      reasons: ['parseRule'],
      declarations: [
        { line: 2, text: 'width: 9px' },
        { line: 2, text: String.raw`\77 idth: 4px` },
      ],
    },
    {
      kind: 'rule',
      line: 3,
      selector: '.bang',
      reasons: ['parseRule'],
      declarations: [
        { line: 3, text: String.raw`width: 4px \!important` },
        { line: 3, text: 'width: 9px' },
      ],
    },
  ])
  expect(result.classes).toEqual(new Map())
})
