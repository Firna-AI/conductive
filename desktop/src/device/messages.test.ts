import { expect, it } from 'vitest'

import { command } from '../../tests/device-support.js'
import { workerMessage } from './messages.js'

it('reads nullable device names and start times from command records', () => {
  for (const metadata of [
    { deviceName: null, startedAt: null },
    { deviceName: 'Cals-Mac.local', startedAt: 1_800_000_001_000 },
  ]) {
    const message = {
      type: 'command.request',
      request: { ...command(), ...metadata },
    }
    expect(workerMessage(JSON.stringify(message))).toEqual(message)
  }
})

it('rejects malformed or missing device display fields before accepting a command record', () => {
  for (const changes of [
    { deviceName: 7, startedAt: null },
    { deviceName: null, startedAt: 'not a timestamp' },
    { deviceName: undefined, startedAt: null },
    { deviceName: null, startedAt: undefined },
  ]) {
    expect(
      workerMessage(
        JSON.stringify({
          type: 'command.request',
          request: { ...command(), ...changes },
        }),
      ),
    ).toBeUndefined()
  }
  const nonFinite = JSON.stringify({
    type: 'command.request',
    request: { ...command(), deviceName: null, startedAt: null },
  }).replace('"startedAt":null', '"startedAt":1e400')
  expect(workerMessage(nonFinite)).toBeUndefined()
})
