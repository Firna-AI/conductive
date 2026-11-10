import { expect, it } from 'vitest'

import { timeWords } from './dates'

it('formats UTC times on the 24-hour clock and leaves other forms unchanged', () => {
  expect(
    ['2026-11-09T21:05Z', '2026-11-10T00:07Z'].map(timeWords),
    'UTC time words',
  ).toEqual(['9 November 2026 at 21:05 UTC', '10 November 2026 at 00:07 UTC'])
  expect(
    [
      '2026-11-09T21:05',
      '2026-11-09T21:05:00Z',
      '2026-11-09T21:05+01:00',
      '2026-11-09',
      'unknown',
    ].map(timeWords),
    'other time forms stay unchanged',
  ).toEqual([
    '2026-11-09T21:05',
    '2026-11-09T21:05:00Z',
    '2026-11-09T21:05+01:00',
    '2026-11-09',
    'unknown',
  ])
})
