import { expect, it } from 'vitest'

import { command } from '../../tests/device-support.js'
import { deviceSettingsFixture } from '../../tests/device-settings-support.js'

it('starts until Stop from a validated settings frame and runs all waiting requests of that workspace', () => {
  const test = deviceSettingsFixture()
  for (const [requestId, workspaceId] of [
    ['first', 'workspace-one'],
    ['second', 'workspace-one'],
    ['other', 'workspace-two'],
  ] as const)
    test.receive({
      type: 'command.request',
      request: command({ requestId, workspaceId }),
    })
  expect(test.processes).toHaveLength(0)
  const message = {
    type: 'settings.operation' as const,
    operationId: 'start',
    operation: {
      action: 'start-workspace-until-stop' as const,
      workspaceId: 'workspace-one',
      workspaceName: null,
    },
  }
  test.receive(message)
  expect(test.processes.map(({ request }) => request.requestId)).toEqual([
    'first',
    'second',
  ])
  expect(test.messages()).toContainEqual({
    type: 'settings.result',
    operationId: 'start',
    outcome: { status: 'done' },
    settings: {
      deviceName: 'Cals-Mac.local',
      alwaysAllowedCommands: [],
      workspaceWindows: [
        {
          workspaceId: 'workspace-one',
          workspaceName: null,
          expiresAt: null,
        },
      ],
    },
  })
  expect(test.openPermissions().settings().workspaceWindows).toEqual([])
  test.receive(message)
  expect(test.processes).toHaveLength(2)
  test.receive({
    type: 'command.request',
    request: command({ requestId: 'next' }),
  })
  expect(test.processes.map(({ request }) => request.requestId)).toEqual([
    'first',
    'second',
    'next',
  ])
  expect(test.permissions.settings().workspaceWindows).toEqual([
    { workspaceId: 'workspace-one', workspaceName: null, expiresAt: null },
  ])
  expect(test.closed).not.toHaveBeenCalled()
})
