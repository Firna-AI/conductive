import { expect, it } from 'vitest'

import {
  sessionFixture,
  successfulResult,
} from '../../tests/device-session-support.js'

it('holds requests for a relay choice and denies without running or granting permission', () => {
  const test = sessionFixture()
  const request = test.command()
  test.session.receive({ type: 'command.request', request })
  expect(test.run).not.toHaveBeenCalled()
  expect(test.sent).toEqual([])
  expect(test.notify).toHaveBeenCalledWith(request)
  test.session.receive({
    type: 'command.approval',
    workspaceId: request.workspaceId,
    requestId: request.requestId,
    operationId: 'deny-one',
    action: 'deny',
  })
  test.session.receive({
    type: 'command.approval',
    workspaceId: request.workspaceId,
    requestId: request.requestId,
    operationId: 'late-allow',
    action: 'always-allow',
  })
  expect(test.sent).toEqual([
    {
      type: 'command.denied',
      workspaceId: 'workspace-one',
      requestId: 'request-one',
    },
  ])
  expect(test.run).not.toHaveBeenCalled()
  expect(test.dismiss).toHaveBeenCalledOnce()
  expect(test.permissions.settings().alwaysAllowedCommands).toEqual([])
})

it('sends approved before execution and keeps Allow limited to one request', async () => {
  const test = sessionFixture()
  const request = test.command()
  test.run.mockImplementationOnce((input) => {
    expect(test.sent).toEqual([
      {
        type: 'command.approved',
        workspaceId: 'workspace-one',
        requestId: 'request-one',
      },
    ])
    expect(input.command).toBe('printf hello')
    return { result: Promise.resolve(successfulResult), cancel: () => {} }
  })
  test.session.receive({ type: 'command.request', request })
  test.session.receive({
    type: 'command.approval',
    workspaceId: request.workspaceId,
    requestId: request.requestId,
    operationId: 'allow-one',
    action: 'allow',
  })
  await Promise.resolve()
  expect(test.sent).toEqual([
    {
      type: 'command.approved',
      workspaceId: 'workspace-one',
      requestId: 'request-one',
    },
    {
      type: 'command.result',
      workspaceId: 'workspace-one',
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
    type: 'command.request',
    request: test.command({ requestId: 'request-two' }),
  })
  expect(test.run).toHaveBeenCalledTimes(1)
  expect(test.notify).toHaveBeenCalledTimes(2)
})

it('applies exact always-allow policy and returns matching settings operations', () => {
  const test = sessionFixture()
  test.session.receive({ type: 'command.request', request: test.command() })
  test.session.receive({
    type: 'command.approval',
    workspaceId: 'workspace-one',
    requestId: 'request-one',
    operationId: 'always-one',
    action: 'always-allow',
  })
  test.session.receive({
    type: 'command.request',
    request: test.command({ requestId: 'request-two' }),
  })
  test.session.receive({
    type: 'command.request',
    request: test.command({
      requestId: 'request-three',
      command: 'printf Hello',
    }),
  })
  expect(test.run).toHaveBeenCalledTimes(2)
  test.session.receive({
    type: 'settings.operation',
    operationId: 'read-one',
    operation: { action: 'read' },
  })
  expect(test.sent.at(-1)).toEqual({
    type: 'settings.result',
    operationId: 'read-one',
    settings: {
      deviceName: 'Cals-Mac.local',
      alwaysAllowedCommands: ['printf hello'],
      workspaceWindows: [],
    },
  })
  test.session.receive({
    type: 'settings.operation',
    operationId: 'remove-one',
    operation: { action: 'remove-command', command: 'printf hello' },
  })
  expect(test.sent.at(-1)).toEqual({
    type: 'settings.result',
    operationId: 'remove-one',
    settings: {
      deviceName: 'Cals-Mac.local',
      alwaysAllowedCommands: [],
      workspaceWindows: [],
    },
  })
})

it('does not extend expired workspace grants from approval replays and applies Stop locally', () => {
  const test = sessionFixture()
  const request = test.command()
  const approval = {
    type: 'command.approval' as const,
    workspaceId: request.workspaceId,
    requestId: request.requestId,
    operationId: 'window-one',
    action: 'allow-workspace-15-minutes' as const,
  }
  test.session.receive({ type: 'command.request', request })
  test.session.receive(approval)
  expect(test.permissions.settings().workspaceWindows).toEqual([
    {
      workspaceId: 'workspace-one',
      workspaceName: 'Checkout address',
      expiresAt: 1_800_000_900_000,
    },
  ])
  test.advance(900_000)
  test.session.receive(approval)
  test.session.receive({ ...approval, operationId: 'window-replay-new-id' })
  expect(test.permissions.settings().workspaceWindows).toEqual([])
  expect(test.run).toHaveBeenCalledTimes(1)
  test.session.receive({
    type: 'command.request',
    request: test.command({ requestId: 'request-two' }),
  })
  test.session.receive({
    ...approval,
    requestId: 'request-two',
    operationId: 'window-two',
  })
  test.session.receive({
    type: 'settings.operation',
    operationId: 'stop-one',
    operation: { action: 'stop-workspace', workspaceId: 'workspace-one' },
  })
  expect(test.permissions.permits('anything', 'workspace-one')).toBe(false)
  expect(test.sent.at(-1)).toEqual({
    type: 'settings.result',
    operationId: 'stop-one',
    settings: {
      deviceName: 'Cals-Mac.local',
      alwaysAllowedCommands: [],
      workspaceWindows: [],
    },
  })
})
