import { expect, it, vi } from 'vitest'

import {
  sessionFixture,
  successfulResult,
} from '../../tests/device-session-support.js'

it('isolates equal request IDs by workspace through approval, cancel, and completion', async () => {
  const test = sessionFixture()
  test.session.receive({ type: 'command.request', request: test.command() })
  test.session.receive({
    type: 'command.request',
    request: test.command({
      workspaceId: 'workspace-two',
      command: 'second command',
    }),
  })
  test.session.receive({
    type: 'command.approval',
    workspaceId: 'workspace-two',
    requestId: 'request-one',
    operationId: 'allow-second',
    action: 'allow',
  })
  expect(
    test.pending.map((item) => [
      item.request.workspaceId,
      item.request.command,
    ]),
  ).toEqual([['workspace-two', 'second command']])
  test.session.receive({
    type: 'command.cancel',
    workspaceId: 'workspace-one',
    requestId: 'request-one',
  })
  expect(test.pending[0].cancel).not.toHaveBeenCalled()
  test.pending[0].finish(successfulResult)
  await Promise.resolve()
  expect(test.sent).toEqual([
    {
      type: 'command.approved',
      workspaceId: 'workspace-two',
      requestId: 'request-one',
    },
    {
      type: 'command.result',
      workspaceId: 'workspace-two',
      requestId: 'request-one',
      result: {
        stdout: 'done',
        stderr: '',
        exitCode: 0,
        timedOut: false,
        truncated: false,
      },
    },
  ])
  test.session.receive({
    type: 'command.approval',
    workspaceId: 'workspace-one',
    requestId: 'request-one',
    operationId: 'late-first',
    action: 'allow',
  })
  expect(test.run).toHaveBeenCalledTimes(1)
  expect(test.invalid).not.toHaveBeenCalled()
})

it('cancels a running command and discards a late result after the turn ends or disconnects', async () => {
  const test = sessionFixture()
  for (const requestId of ['cancelled-turn', 'disconnected']) {
    test.session.receive({
      type: 'command.request',
      request: test.command({ requestId }),
    })
    test.session.receive({
      type: 'command.approval',
      workspaceId: 'workspace-one',
      requestId,
      operationId: requestId,
      action: 'allow',
    })
  }
  test.session.receive({
    type: 'command.cancel',
    workspaceId: 'workspace-one',
    requestId: 'cancelled-turn',
  })
  test.session.dispose()
  test.pending.forEach((item) => item.finish(successfulResult))
  await Promise.resolve()
  expect(test.pending.map((item) => item.cancel.mock.calls.length)).toEqual([
    1, 1,
  ])
  expect(test.sent.map((message) => message.type)).toEqual([
    'command.approved',
    'command.approved',
  ])
})

it('rejects another pairing, another account, and a conflicting request without execution', () => {
  const test = sessionFixture()
  const request = test.command()
  test.session.receive({
    type: 'command.request',
    request: test.command({
      device: { deviceId: 'local-device', connectionId: 'old-connection' },
    }),
  })
  test.session.receive({
    type: 'command.request',
    request: test.command({ sender: { ...request.sender, id: 'user-two' } }),
  })
  test.session.receive({ type: 'command.request', request })
  test.session.receive({ type: 'command.request', request: { ...request } })
  test.session.receive({
    type: 'command.request',
    request: { ...request, command: 'conflicting command' },
  })
  expect(test.invalid).toHaveBeenCalledTimes(3)
  expect(test.run).not.toHaveBeenCalled()
  expect(test.notify).toHaveBeenCalledOnce()
})

it('reports a failed private permission write without executing or exposing its error', () => {
  const test = sessionFixture()
  test.files.write = () => {
    throw new Error('private secret in filesystem error')
  }
  test.session.receive({ type: 'command.request', request: test.command() })
  test.session.receive({
    type: 'command.approval',
    workspaceId: 'workspace-one',
    requestId: 'request-one',
    operationId: 'always-one',
    action: 'always-allow',
  })
  expect(test.sent).toEqual([
    {
      type: 'command.failed',
      workspaceId: 'workspace-one',
      requestId: 'request-one',
      message: 'The Mac could not save this permission. Try again.',
    },
  ])
  expect(test.run).not.toHaveBeenCalled()
  expect(test.warn).toHaveBeenCalledWith()
})

it('reports a failed settings change with effective settings when the change cannot apply', () => {
  const test = sessionFixture()
  test.permissions.allowCommand('printf hello')
  vi.spyOn(test.permissions, 'removeCommand').mockImplementationOnce(() => {
    throw new Error('/private/account/permission-file')
  })
  test.session.receive({
    type: 'settings.operation',
    operationId: 'remove-failed',
    operation: { action: 'remove-command', command: 'printf hello' },
  })
  expect(test.sent.at(-1)).toEqual({
    type: 'settings.result',
    operationId: 'remove-failed',
    settings: {
      deviceName: 'Cals-Mac.local',
      alwaysAllowedCommands: ['printf hello'],
      workspaceWindows: [],
    },
    outcome: {
      status: 'failed',
      message: 'The Mac could not change this permission. Try again.',
    },
  })
  expect(test.warn).toHaveBeenCalledOnce()
})
