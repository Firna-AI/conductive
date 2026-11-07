import { describe, expect, it } from 'vitest'
import { buildTime } from './time'

describe('buildTime', () => {
  it('compares_local_calendar_days_across_clock_changes_and_year_boundaries', () => {
    const cases = [
      {
        name: 'two calendar days ago after clocks advance',
        at: '2026-03-07T23:00:00-05:00',
        now: '2026-03-09T00:30:00-04:00',
        expected: '7 Mar',
      },
      {
        name: 'the previous calendar day after clocks go back',
        at: '2026-10-31T23:00:00-04:00',
        now: '2026-11-01T23:30:00-05:00',
        expected: 'Yesterday',
      },
      {
        name: 'under 24 elapsed hours after clocks advance',
        at: '2026-03-08T00:00:00-05:00',
        now: '2026-03-09T00:30:00-04:00',
        expected: '23 hours ago',
      },
      {
        name: 'the previous calendar day in the previous year',
        at: '2026-12-31T00:00:00-05:00',
        now: '2027-01-01T00:30:00-05:00',
        expected: 'Yesterday',
      },
      {
        name: 'an older local date whose UTC date is in the next year',
        at: '2026-12-31T23:00:00-05:00',
        now: '2027-01-02T00:30:00-05:00',
        expected: '31 Dec 2026',
      },
    ]

    for (const item of cases) {
      expect
        .soft(
          buildTime(
            Date.parse(item.at),
            Date.parse(item.now),
            'America/New_York',
          ),
          item.name,
        )
        .toBe(item.expected)
    }
  })
})
