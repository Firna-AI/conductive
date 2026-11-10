import { expect, it } from 'vitest'

import { guidePages } from './docs-guides'
import { docsPath } from './links'

it('uses guide metadata defaults without losing valid values', () => {
  const scenarios: readonly { name: string; data: unknown }[] = [
    { name: 'missing data', data: undefined },
    { name: 'null data', data: null },
    { name: 'missing fields', data: {} },
    {
      name: 'wrong field types',
      data: { title: 23, description: false, group: 'Other', order: '2' },
    },
    {
      name: 'empty fields',
      data: { title: '  ', description: '', group: '', order: null },
    },
  ]
  for (const { name, data } of scenarios) {
    const pages = guidePages([{ id: 'fallback', data }])
    expect(
      pages.map((page) => page.guide),
      name,
    ).toEqual([
      {
        id: 'fallback',
        title: 'fallback',
        description: undefined,
        group: 'Start',
        order: undefined,
        href: `${docsPath}/fallback`,
      },
    ])
  }

  const pages = guidePages([
    {
      id: 'valid',
      data: {
        title: 'A guide',
        description: 'A description',
        group: 'Work',
        order: 0,
      },
    },
  ])
  expect(pages.map((page) => page.guide)).toEqual([
    {
      id: 'valid',
      title: 'A guide',
      description: 'A description',
      group: 'Work',
      order: 0,
      href: `${docsPath}/valid`,
    },
  ])
})

it('orders guide menus and neighbours by group, numeric order, and ASCII ID', () => {
  const entries: readonly { id: string; data: unknown }[] = [
    { id: 'manage-first', data: { group: 'Manage', order: -200 } },
    { id: 'start-tail-2', data: {} },
    { id: 'start-2', data: { order: 10 } },
    { id: 'work-first', data: { group: 'Work', order: -100 } },
    { id: 'start-tail-10', data: {} },
    { id: 'start-10', data: { order: 10 } },
    { id: 'overview', data: { order: 0 } },
    { id: 'start-low', data: { order: 2 } },
  ]
  const pages = guidePages(entries)
  expect(
    pages.map(({ guide, previous, next }) => [
      guide.id,
      previous?.id,
      next?.id,
    ]),
  ).toEqual([
    ['overview', undefined, 'start-low'],
    ['start-low', 'overview', 'start-10'],
    ['start-10', 'start-low', 'start-2'],
    ['start-2', 'start-10', 'start-tail-10'],
    ['start-tail-10', 'start-2', 'start-tail-2'],
    ['start-tail-2', 'start-tail-10', 'work-first'],
    ['work-first', 'start-tail-2', 'manage-first'],
    ['manage-first', 'work-first', undefined],
  ])
  for (const page of pages) {
    expect(
      page.groups.map(({ name, guides }) => [
        name,
        guides.map((guide) => guide.id),
      ]),
      page.guide.id,
    ).toEqual([
      [
        'Start',
        [
          'overview',
          'start-low',
          'start-10',
          'start-2',
          'start-tail-10',
          'start-tail-2',
        ],
      ],
      ['Work', ['work-first']],
      ['Manage', ['manage-first']],
    ])
  }
  expect(pages.map((page) => page.guide.href)).toEqual([
    docsPath,
    `${docsPath}/start-low`,
    `${docsPath}/start-10`,
    `${docsPath}/start-2`,
    `${docsPath}/start-tail-10`,
    `${docsPath}/start-tail-2`,
    `${docsPath}/work-first`,
    `${docsPath}/manage-first`,
  ])
})
