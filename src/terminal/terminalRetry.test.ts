import { expect, it } from 'vitest'
import type { TerminalEnd } from '../shared/terminal'
import { retries } from './terminalRetry'

it('connects a lost connection again once, and again after a try that worked for a minute', () => {
  const cases: [boolean, TerminalEnd, number, boolean][] = [
    // automatic try, end, lasted since the first output, connects again
    [false, 'lost', 0, true],
    [false, 'closed', 300_000, false],
    [true, 'lost', 59_999, false],
    [true, 'lost', 60_000, true],
    [true, 'closed', 300_000, false],
  ]
  const results = cases.map(([automatic, end, lasted]) =>
    retries(automatic, { end, lasted }),
  )
  expect(results).toEqual(cases.map((each) => each[3]))
})
