import { expect, it } from 'vitest'

import { ServerTiming } from './server-timing'

it('lists each step in order with a whole number of milliseconds', async () => {
  const timing = new ServerTiming()
  expect(await timing.step('access', async () => 'row')).toBe('row')
  timing.add('upstream', 12.6)
  timing.add('check', -1)
  expect(timing.header()).toMatch(
    /^access;dur=\d+, upstream;dur=13, check;dur=0$/,
  )
})

it('records a step that fails and passes on its error', async () => {
  const timing = new ServerTiming()
  const failure = new Error('refused')
  await expect(
    timing.step('access', () => Promise.reject(failure)),
  ).rejects.toBe(failure)
  expect(timing.header()).toMatch(/^access;dur=\d+$/)
})
