import { describe, expect, it } from 'vitest'
import {
  wakeUpTime,
  wakeUpTimeUtc,
} from '../../docs/mockups/src/components/chat/wakeUpCopy'

// Vitest runs no test under `docs/mockups/`, so the time words that the
// chat, a copy, and the Worker share are tested here. A wire time is any
// safe integer, but a JavaScript date ends on 13 September 275760. The
// expected words come from the proleptic Gregorian calendar, worked out by
// hand in `.context/agent-wake/m5/far-times.py`.

/** Friday 15 January 2027 at 08:00 UTC, as the reader's clock. */
const clock = { now: Date.UTC(2027, 0, 15, 8), timeZone: 'UTC' }

describe('the words of the time of a wake-up', () => {
  it.each([
    [8_640_000_000_000_000, '13 September 275760, 00:00 UTC'],
    [8_640_000_000_000_001, '13 September 275760, 00:00 UTC'],
    [Number.MAX_SAFE_INTEGER, '12 October 287396, 08:59 UTC'],
    [-Number.MAX_SAFE_INTEGER, '21 March 283458 BC, 15:00 UTC'],
  ])('gives %d in UTC as %s', (at, words) => {
    expect(wakeUpTimeUtc(at)).toBe(words)
  })

  it.each([
    [8_640_000_000_000_001, 'Sat 13 Sept 275760 at 00:00'],
    [Number.MAX_SAFE_INTEGER, 'Wed 12 Oct 287396 at 08:59'],
    [-Number.MAX_SAFE_INTEGER, 'Thu 21 Mar 283458 BC at 15:00'],
  ])('gives %d to the reader as %s', (at, words) => {
    expect(wakeUpTime(at, clock)).toBe(words)
  })
})
