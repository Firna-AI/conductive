import { expect, it } from 'vitest'

import { WorkerErrorLimiter } from './suppression'

it('limits each key and the whole isolate over a sliding minute', () => {
  let now = 1000
  const limiter = new WorkerErrorLimiter(() => now)
  expect(limiter.admit('first')).toBe(true)
  now = 59_999
  expect(limiter.admit('first')).toBe(false)
  for (let index = 1; index < 60; index++)
    expect(limiter.admit(`key-${index}`)).toBe(true)
  expect(limiter.admit('global-limit')).toBe(false)
  now = 61_000
  expect(limiter.admit('first')).toBe(true)
  expect(limiter.admit('global-limit')).toBe(false)
  now = 119_999
  expect(limiter.admit('global-limit')).toBe(true)
})

it('keeps no more than 1024 last-sent keys', () => {
  let now = 0
  const limiter = new WorkerErrorLimiter(() => now)
  for (let index = 0; index < 1025; index++) {
    now += 60_000
    expect(limiter.admit(`key-${index}`)).toBe(true)
  }
  expect(limiter.size).toBe(1024)
})
