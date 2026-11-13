import { expect, it } from 'vitest'

import { sessionFixture } from '../../tests/device-session-support.js'
import { workerMessage } from './messages.js'

it('extends through a settings frame, returns the effective settings, and ignores a repeated operation ID', () => {
  const test = sessionFixture()
  test.session.receive({ type: 'command.request', request: test.command() })
  test.session.receive({
    type: 'command.approval',
    operationId: 'allow-workspace',
    workspaceId: 'workspace-one',
    requestId: 'request-one',
    action: 'allow-workspace-15-minutes',
  })
  test.advance(300_000)
  const frame = JSON.stringify({
    type: 'settings.operation',
    operationId: 'extend-one',
    operation: { action: 'extend-workspace', workspaceId: 'workspace-one' },
  })
  const receive = () => {
    const message = workerMessage(frame)
    expect(message?.type).toBe('settings.operation')
    if (!message) throw new Error('Missing settings operation')
    test.session.receive(message)
  }
  receive()
  const result = {
    type: 'settings.result',
    operationId: 'extend-one',
    outcome: { status: 'done' },
    settings: {
      deviceName: 'Cals-Mac.local',
      alwaysAllowedCommands: [],
      workspaceWindows: [
        {
          workspaceId: 'workspace-one',
          workspaceName: 'Checkout address',
          expiresAt: 1_800_001_200_000,
        },
      ],
    },
  }
  expect(test.sent.at(-1)).toEqual(result)
  const count = test.sent.length
  test.advance(300_000)
  receive()
  expect(test.sent).toHaveLength(count)
  expect(test.permissions.settings()).toEqual(result.settings)
})

it('returns failed Extend with the current grant when the save fails', () => {
  const test = sessionFixture()
  test.permissions.allowWorkspace('workspace-one', 'Checkout address')
  test.advance(300_000)
  test.files.write = () => {
    throw new Error('private disk failure')
  }
  test.session.receive({
    type: 'settings.operation',
    operationId: 'extend-failed',
    operation: { action: 'extend-workspace', workspaceId: 'workspace-one' },
  })
  expect(test.sent.at(-1)).toEqual({
    type: 'settings.result',
    operationId: 'extend-failed',
    outcome: {
      status: 'failed',
      message: 'The Mac could not extend the 15 minutes. Try again.',
    },
    settings: {
      deviceName: 'Cals-Mac.local',
      alwaysAllowedCommands: [],
      workspaceWindows: [
        {
          workspaceId: 'workspace-one',
          workspaceName: 'Checkout address',
          expiresAt: 1_800_000_900_000,
        },
      ],
    },
  })
})
