import { expect, it } from 'vitest'

import type { OperatorIdleStopResponse } from '../../shared/operator-idle-stop'
import { ParseError } from './parse'
import { readOperatorIdleStop } from './read-operator-idle-stop'

it('keeps the stop time and the last change, and refuses a time that is not a choice', () => {
  const reply: OperatorIdleStopResponse = {
    minutes: 90,
    updatedAt: 1_800_000_000_000,
    operator: { githubId: 7, login: 'operator' },
  }
  expect(readOperatorIdleStop(reply)).toEqual(reply)
  expect(
    readOperatorIdleStop({ minutes: 30, updatedAt: null, operator: null }),
  ).toEqual({ minutes: 30, updatedAt: null, operator: null })
  for (const minutes of [45, '30', null])
    expect(() => readOperatorIdleStop({ ...reply, minutes })).toThrow(
      ParseError,
    )
})
