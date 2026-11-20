import { expect, it, vi } from 'vitest'

import { DEVICE_FRAME_LIMIT_BYTES } from '../../../src/shared/device.ts'
import { deviceSettingsFixture } from '../../tests/device-settings-support.js'
import { command } from '../../tests/device-support.js'

it('fails a Start that crosses the settings reply budget without granting permission or running waiting requests', () => {
  const test = deviceSettingsFixture()
  for (let index = 0; index < 400; index += 1)
    test.permissions.allowWorkspaceUntilStop(
      `existing-${index}`,
      `Existing workspace ${index} ${'w'.repeat(175)}`,
    )
  const emptySize = Buffer.byteLength(
    JSON.stringify({
      type: 'settings.result',
      operationId: 'start',
      settings: test.permissions.settings(),
      outcome: { status: 'done' },
    }),
  )
  test.permissions.allowCommand('x'.repeat(999_950 - emptySize - 2))
  const commandsSize = Buffer.byteLength(
    JSON.stringify(test.permissions.settings().alwaysAllowedCommands),
  )
  expect(commandsSize).toBeGreaterThan(880_000)
  expect(commandsSize).toBeLessThanOrEqual(900_000)
  test.receive({
    type: 'settings.operation',
    operationId: 'prior',
    operation: { action: 'read' },
  })
  expect(test.messages().at(-1)).toMatchObject({ type: 'settings.result' })
  const before = test.wire.send.mock.calls.at(-1)?.[0] ?? ''
  expect(Buffer.byteLength(before)).toBe(999_950)
  test.receive({
    type: 'command.request',
    request: command(),
  })
  const write = vi.spyOn(test.files, 'write')
  test.receive({
    type: 'settings.operation',
    operationId: 'start',
    operation: {
      action: 'start-workspace-until-stop',
      workspaceId: 'workspace-one',
      workspaceName: null,
    },
  })
  expect(test.messages().at(-1)).toEqual({
    type: 'settings.failed',
    operationId: 'start',
    code: 'settings_result_too_large',
  })
  expect(test.permissions.permits('unrelated command', 'workspace-one')).toBe(
    false,
  )
  expect(test.permissions.settings().workspaceWindows).toHaveLength(400)
  expect(write).not.toHaveBeenCalled()
  expect(test.processes).toHaveLength(0)
  test.receive({
    type: 'command.request',
    request: command({ requestId: 'later' }),
  })
  expect(test.processes).toHaveLength(0)
  expect(test.closed).not.toHaveBeenCalled()
  for (const [frame] of test.wire.send.mock.calls)
    expect(Buffer.byteLength(frame)).toBeLessThanOrEqual(
      DEVICE_FRAME_LIMIT_BYTES,
    )
})

it.each(['keep-workspace', 'extend-workspace'] as const)(
  'leaves the saved end and timer unchanged when %s cannot return its settings',
  (action) => {
    const test = deviceSettingsFixture(['x'.repeat(1_000_000)])
    test.permissions.allowWorkspace('workspace-one', 'First')
    test.advance(300_000)
    const write = vi.spyOn(test.files, 'write')
    test.receive({
      type: 'settings.operation',
      operationId: action,
      operation: { action, workspaceId: 'workspace-one' },
    })
    expect(test.messages().at(-1)).toEqual({
      type: 'settings.failed',
      operationId: action,
      code: 'settings_result_too_large',
    })
    expect(test.permissions.settings().workspaceWindows).toEqual([
      {
        workspaceId: 'workspace-one',
        workspaceName: 'First',
        expiresAt: 1_800_000_900_000,
      },
    ])
    expect(write).not.toHaveBeenCalled()
    expect(test.openPermissions().settings().workspaceWindows).toEqual(
      test.permissions.settings().workspaceWindows,
    )
    test.advance(600_000)
    expect(test.permissions.permits('anything', 'workspace-one')).toBe(false)
    expect(test.closed).not.toHaveBeenCalled()
  },
)

it.each(['start-workspace-until-stop', 'keep-workspace'] as const)(
  'leaves permission unchanged when the transport rejects %s',
  (action) => {
    const test = deviceSettingsFixture()
    if (action === 'keep-workspace')
      test.permissions.allowWorkspace('workspace-one', 'First')
    const before = test.permissions.settings()
    const write = vi.spyOn(test.files, 'write')
    test.wire.bufferedAmount = DEVICE_FRAME_LIMIT_BYTES
    test.receive({
      type: 'settings.operation',
      operationId: action,
      operation: {
        action,
        workspaceId: 'workspace-one',
        workspaceName: 'First',
      },
    })
    expect(test.closed).toHaveBeenCalledOnce()
    expect(test.permissions.settings()).toEqual(before)
    expect(write).not.toHaveBeenCalled()
    expect(test.processes).toHaveLength(0)
  },
)
