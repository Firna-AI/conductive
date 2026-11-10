import { Window } from 'happy-dom'
import { expect } from 'vitest'

import { parityAreas } from '../../src/marketing/from-conductor/areas'
import { parityPageCopy } from '../../src/marketing/from-conductor/copy'
import {
  parityCheckedAt,
  parityFeatures,
} from '../../src/marketing/from-conductor/features'
import { parityStatuses } from '../../src/marketing/from-conductor/statuses'
import { headings, words } from './html.test-support'

export async function checkBuiltComparison(page: string) {
  for (const text of [parityPageCopy.title]) {
    expect(words(page)).toContain(text)
  }
  const tables = [...page.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g)]
  expect(tables).toHaveLength(1)
  const table = tables[0]?.[1] ?? ''
  expect(headings(table, 'col')).toEqual(Object.values(parityPageCopy.columns))
  const groups = [...table.matchAll(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/g)]
  expect(groups).toHaveLength(parityAreas.length)
  expect(headings(table, 'rowgroup')).toEqual(
    parityAreas.map((area) => area.title),
  )
  const rows = groups.flatMap(([, body]) =>
    [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map(([, row]) => row),
  )
  expect(rows).toHaveLength(parityFeatures.length)
  for (const id of ['attachments', 'cloud-desktop', 'direct-links']) {
    const feature = parityFeatures.find((item) => item.id === id)!
    const row = rows.find((item) =>
      headings(item, 'row').includes(feature.name),
    )
    expect(words(row ?? ''), id).toContain(parityStatuses[feature.status].label)
    const area = parityAreas.find((item) => item.key === feature.area)!
    expect(headings(row ?? '', 'row'), id).toEqual([area.title, feature.name])
  }

  const window = new Window()
  try {
    const document = new window.DOMParser().parseFromString(page, 'text/html')
    const checkLine = document.querySelector('.parity-intro > p:last-child')
    expect(checkLine?.firstChild?.textContent?.trim(), 'check line label').toBe(
      parityPageCopy.lastCheck.label,
    )
    expect(
      [...(checkLine?.querySelectorAll('time') ?? [])].map((time) =>
        time.getAttribute('datetime'),
      ),
      'check line time',
    ).toEqual([parityCheckedAt])

    const featureRows = [...document.querySelectorAll('table tbody tr')]
    expect(
      featureRows.map((row) => row.id),
      'comparison row ids',
    ).toEqual(parityFeatures.map((feature) => feature.id))
    for (const [index, feature] of parityFeatures.entries()) {
      const row = featureRows[index]
      expect(
        [...(row?.querySelectorAll('a') ?? [])].map((link) => ({
          href: link.getAttribute('href'),
          name: link.getAttribute('aria-label'),
        })),
        `row link ${feature.id}`,
      ).toEqual([{ href: `#${feature.id}`, name: `Link to ${feature.name}` }])
      expect(
        row?.querySelector('th.parity-name')?.getAttribute('aria-label'),
        `row header ${feature.id}`,
      ).toBe(feature.name)
    }

    const ids = [...document.querySelectorAll('[id]')].map((element) =>
      element.getAttribute('id'),
    )
    expect(ids, 'unique page ids').toEqual([...new Set(ids)])
  } finally {
    await window.happyDOM.close()
  }
}
