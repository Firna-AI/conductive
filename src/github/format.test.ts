import { expect, it } from 'vitest'
import { formatDuration, formatTimeAgo } from './format'

it('writes how long a check ran in seconds, minutes, or hours', () => {
  const durations = [22_000, 72_000, 63_000, 218_000, 3_725_000]

  expect(durations.map(formatDuration)).toEqual([
    '22s',
    '1m 12s',
    '1m 03s',
    '3m 38s',
    '1h 02m',
  ])
})

it('writes a past time as minutes, hours, or days before now', () => {
  const now = 1_800_000_000_000
  const times = [
    now - 30_000,
    now - 5 * 60_000,
    now - 2 * 3_600_000,
    now - 26 * 3_600_000,
  ]

  expect(times.map((time) => formatTimeAgo(time, now))).toEqual([
    'just now',
    '5m ago',
    '2h ago',
    '1d ago',
  ])
})
