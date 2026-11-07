import { expect, it, vi } from 'vitest'

import { deviceLifecycleFixture } from '../../tests/device-lifecycle-support.js'

it('recovers saved permissions after a failed read and failed addition without losing rules on a later save', async () => {
  const test = deviceLifecycleFixture()
  const saved = test.openPermissions()
  saved.allowCommand('printf saved')
  saved.allowWorkspace('workspace-one', 'Checkout address')
  saved.dispose()
  const read = vi.spyOn(test.files, 'read').mockImplementationOnce(() => {
    throw new Error('/private/account/permission-file: unavailable')
  })
  await test.start()
  test.receive({
    type: 'command.request',
    request: test.command({
      requestId: 'before-read-recovery',
      command: 'printf saved',
    }),
  })
  expect(test.processes).toHaveLength(0)
  expect(test.notify).toHaveBeenCalledOnce()
  expect(test.warn).toHaveBeenCalledOnce()
  expect(read).toHaveBeenCalledOnce()

  vi.spyOn(test.files, 'write').mockImplementationOnce(() => {
    throw new Error('/private/account/permission-file: disk full')
  })
  const failedAddition = test.command({
    requestId: 'failed-addition',
    workspaceId: 'no-window',
    command: 'printf added',
  })
  test.receive({ type: 'command.request', request: failedAddition })
  test.receive({
    type: 'command.approval',
    workspaceId: failedAddition.workspaceId,
    requestId: failedAddition.requestId,
    operationId: 'failed-added-command',
    action: 'always-allow',
  })
  expect(test.processes).toHaveLength(0)
  expect(test.messages().at(-1)).toEqual({
    type: 'command.failed',
    workspaceId: 'no-window',
    requestId: 'failed-addition',
    message: 'The Mac could not save this permission. Try again.',
  })

  test.connection.sleep()
  await test.connection.wake()
  test.pair()
  test.receive({
    type: 'command.request',
    request: test.command({
      requestId: 'after-read-recovery',
      command: 'printf saved',
      workspaceId: 'no-window',
    }),
  })
  test.receive({
    type: 'command.request',
    request: test.command({
      requestId: 'workspace-after-recovery',
      command: 'printf workspace',
    }),
  })
  expect(test.processes.map((process) => process.command)).toEqual([
    'printf saved',
    'printf workspace',
  ])
  expect(test.notify).toHaveBeenCalledTimes(2)
  expect(read).toHaveBeenCalledTimes(2)

  const addition = test.command({
    requestId: 'new-permission',
    workspaceId: 'no-window',
    command: 'printf added',
  })
  test.receive({ type: 'command.request', request: addition })
  expect(test.processes).toHaveLength(2)
  expect(test.notify).toHaveBeenCalledTimes(3)
  test.receive({
    type: 'command.approval',
    workspaceId: addition.workspaceId,
    requestId: addition.requestId,
    operationId: 'save-added-command',
    action: 'always-allow',
  })
  expect(test.processes.map((process) => process.command)).toEqual([
    'printf saved',
    'printf workspace',
    'printf added',
  ])
  const restored = test.openPermissions()
  expect(restored.settings()).toEqual({
    deviceName: 'Cals-Mac.local',
    alwaysAllowedCommands: ['printf saved', 'printf added'],
    workspaceWindows: [
      {
        workspaceId: 'workspace-one',
        workspaceName: 'Checkout address',
        expiresAt: 1_800_000_900_000,
      },
    ],
  })
  restored.dispose()
  expect(test.warn).toHaveBeenCalledTimes(2)
  expect(test.invalid).not.toHaveBeenCalled()
})

it.each([
  {
    action: 'Remove',
    operation: { action: 'remove-command' as const, command: 'printf saved' },
  },
  {
    action: 'Stop',
    operation: {
      action: 'stop-workspace' as const,
      workspaceId: 'workspace-one',
    },
  },
])(
  '$action intent after a failed read and save prevents stale permissions from returning on reconnect',
  async ({ operation }) => {
    const test = deviceLifecycleFixture()
    const saved = test.openPermissions()
    if (operation.action === 'remove-command')
      saved.allowCommand('printf saved')
    else saved.allowWorkspace('workspace-one', 'Checkout address')
    saved.dispose()
    vi.spyOn(test.files, 'read').mockImplementationOnce(() => {
      throw new Error('/private/account/permission-file: unavailable')
    })
    await test.start()
    test.files.write = () => {
      throw new Error('/private/account/permission-file: disk full')
    }
    test.receive({
      type: 'settings.operation',
      operationId: 'revoke-after-failed-read',
      operation,
    })
    expect(test.messages().at(-1)).toEqual({
      type: 'settings.result',
      operationId: 'revoke-after-failed-read',
      settings: {
        deviceName: 'Cals-Mac.local',
        alwaysAllowedCommands: [],
        workspaceWindows: [],
      },
      outcome: {
        status: 'done-not-saved',
        message:
          'This permission change is active, but the Mac could not save it. Try again.',
      },
    })
    test.connection.sleep()
    await test.connection.wake()
    test.pair()
    const request = test.command({
      requestId: 'after-reconnect',
      command: 'printf saved',
    })
    test.receive({ type: 'command.request', request })
    expect(test.processes).toHaveLength(0)
    expect(test.notify).toHaveBeenCalledWith(request)
    const restored = test.openPermissions()
    expect(restored.permits('printf saved', 'workspace-one')).toBe(true)
    restored.dispose()
    expect(test.warn).toHaveBeenCalledTimes(2)
    expect(test.invalid).not.toHaveBeenCalled()
  },
)
