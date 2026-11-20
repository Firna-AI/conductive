import { expect, it } from 'vitest'

import { readOutput } from './read-output'

it('keeps provider result end reasons restricted to the background work limit', () => {
  const event = {
    type: 'result',
    state: 'finished',
    userMessageIds: ['request'],
  }
  for (const endReason of [undefined, 'background_work_limit']) {
    const output = {
      type: 'event',
      event: { ...event, ...(endReason ? { endReason } : {}) },
    }
    expect(readOutput(output)).toEqual(output)
  }
  expect(() =>
    readOutput({
      type: 'event',
      event: { ...event, endReason: 'cloud_computer_stopped' },
    }),
  ).toThrowError('The value is not supported.')
})
