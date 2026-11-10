import { afterAll, beforeAll, expect, it, vi } from 'vitest'

let timeWords: (time: string) => string

/*
 * A time zone other than UTC, set before the module builds its formats, so
 * that words in local time fail the test on every machine.
 */
beforeAll(async () => {
  vi.stubEnv('TZ', 'America/New_York')
  vi.resetModules()
  ;({ timeWords } = await import('./dates'))
})

afterAll(() => {
  vi.unstubAllEnvs()
})

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
