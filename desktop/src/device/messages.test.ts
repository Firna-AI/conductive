import { expect, it } from 'vitest'

import { command } from '../../tests/device-support.js'
import { workerMessage } from './messages.js'

it('accepts Extend only with a non-empty workspace ID', () => {
  const message = {
    type: 'settings.operation',
    operationId: 'extend-one',
    operation: { action: 'extend-workspace', workspaceId: 'workspace-one' },
  }
  expect(workerMessage(JSON.stringify(message))).toEqual(message)
  for (const workspaceId of [undefined, '', 7])
    expect(
      workerMessage(
        JSON.stringify({
          ...message,
          operation: { action: 'extend-workspace', workspaceId },
        }),
      ),
    ).toBeUndefined()
})

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

it('rejects malformed or missing command fields before accepting a command record', () => {
  for (const changes of [
    { requestKey: undefined },
    { requestKey: 7 },
    { requestKey: '' },
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

it('accepts a command request whose workspace name is null', () => {
  expect(
    workerMessage(
      JSON.stringify({
        type: 'command.request',
        request: command({ workspaceName: null }),
      }),
    ),
  ).toMatchObject({
    type: 'command.request',
    request: { workspaceName: null },
  })
})
