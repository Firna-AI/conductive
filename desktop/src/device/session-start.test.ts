import { expect, it } from 'vitest'

import { command } from '../../tests/device-support.js'
import { deviceSettingsFixture } from '../../tests/device-settings-support.js'

it('starts until Stop from a validated settings frame and runs only waiting requests of that period and workspace', () => {
  const test = deviceSettingsFixture()
  for (const [requestId, workspaceId, macAccessPeriod] of [
    ['first', 'workspace-one', 2],
    ['second', 'workspace-one', 2],
    ['older', 'workspace-one', 1],
    ['other', 'workspace-two', 2],
  ] as const)
    test.receive({
      type: 'command.request',
      request: command({ requestId, workspaceId }),
      macAccessPeriod,
    })
  expect(test.processes).toHaveLength(0)
  const message = {
    type: 'settings.operation' as const,
    operationId: 'start',
    operation: {
      action: 'start-workspace-until-stop' as const,
      workspaceId: 'workspace-one',
      workspaceName: null,
      macAccessPeriod: 2,
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
          macAccessPeriod: 2,
        },
      ],
    },
  })
  expect(test.openPermissions().settings().workspaceWindows).toEqual([])
  test.receive(message)
  expect(test.processes).toHaveLength(2)
  test.receive({
    type: 'command.request',
    request: command({ requestId: 'next-period' }),
    macAccessPeriod: 3,
  })
  expect(test.processes).toHaveLength(2)
  expect(test.permissions.settings().workspaceWindows).toEqual([])
  expect(test.closed).not.toHaveBeenCalled()
})

it('ends an old grant and reports failed when Keep or Extend carries a newer period', () => {
  const test = deviceSettingsFixture()
  for (const action of ['keep-workspace', 'extend-workspace'] as const) {
    test.permissions.allowWorkspace('workspace-one', 'First', 4)
    test.receive({
      type: 'settings.operation',
      operationId: action,
      operation: { action, workspaceId: 'workspace-one', macAccessPeriod: 5 },
    })
    expect(test.messages().at(-1)).toMatchObject({
      type: 'settings.result',
      operationId: action,
      outcome: { status: 'failed' },
      settings: { workspaceWindows: [] },
    })
  }
})
