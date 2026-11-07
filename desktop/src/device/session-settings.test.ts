import { expect, it } from 'vitest'

import {
  DEVICE_FRAME_LIMIT_BYTES,
  DEVICE_OUTPUT_LIMIT_BYTES,
} from '../../../src/shared/device.ts'
import { deviceSettingsFixture } from '../../tests/device-settings-support.js'
import { command } from '../../tests/device-support.js'

it('reports oversized settings for only that operation and keeps commands, output bounds, and cancellation working', async () => {
  const test = deviceSettingsFixture()
  const commands = [
    'printf ongoing',
    'printf cancelled',
    `printf '${'a'.repeat(500_000)}'`,
    `printf '${'b'.repeat(500_000)}'`,
  ]
  commands.forEach((text) => test.permissions.allowCommand(text))
  expect(
    Buffer.byteLength(JSON.stringify(test.permissions.settings())),
  ).toBeGreaterThan(DEVICE_FRAME_LIMIT_BYTES)
  for (const [index, text] of commands.slice(0, 2).entries())
    test.receive({
      type: 'command.request',
      request: command({ requestId: `running-${index}`, command: text }),
    })

  test.receive({
    type: 'settings.operation',
    operationId: 'oversized-read',
    operation: { action: 'read' },
  })
  expect(test.messages().at(-1)).toEqual({
    type: 'settings.failed',
    operationId: 'oversized-read',
    code: 'settings_result_too_large',
  })
  expect(test.permissions.settings().alwaysAllowedCommands).toEqual(commands)
  expect(test.closed).not.toHaveBeenCalled()
  expect(
    test.processes.map((process) => process.kill.mock.calls.length),
  ).toEqual([0, 0])
  test.receive({
    type: 'command.cancel',
    workspaceId: 'workspace-one',
    requestId: 'running-1',
  })
  expect(test.processes[1].kill).toHaveBeenCalledOnce()
  test.processes[0].events.stdout(
    Buffer.from('\0'.repeat(DEVICE_OUTPUT_LIMIT_BYTES + 10)),
  )
  test.processes[0].events.close(0)
  await Promise.resolve()
  expect(test.messages().at(-1)).toEqual({
    type: 'command.result',
    workspaceId: 'workspace-one',
    requestId: 'running-0',
    result: {
      stdout: '\0'.repeat(65_536),
      stderr: '',
      exitCode: 0,
      timedOut: false,
      truncated: true,
    },
  })
  test.receive({
    type: 'command.request',
    request: command({ requestId: 'still-allowed', command: commands[2] }),
  })
  expect(test.processes).toHaveLength(3)
  expect(test.processes[2].request.command).toBe(commands[2])
  test.processes[2].events.stdout(Buffer.from('still available'))
  test.processes[2].events.close(0)
  await Promise.resolve()
  expect(test.messages().at(-1)).toEqual({
    type: 'command.result',
    workspaceId: 'workspace-one',
    requestId: 'still-allowed',
    result: {
      stdout: 'still available',
      stderr: '',
      exitCode: 0,
      timedOut: false,
      truncated: false,
    },
  })
  test.receive({
    type: 'settings.operation',
    operationId: 'another-oversized-read',
    operation: { action: 'read' },
  })
  expect(test.messages().at(-1)).toEqual({
    type: 'settings.failed',
    operationId: 'another-oversized-read',
    code: 'settings_result_too_large',
  })
  for (const [frame] of test.wire.send.mock.calls)
    expect(Buffer.byteLength(frame)).toBeLessThanOrEqual(
      DEVICE_FRAME_LIMIT_BYTES,
    )
  expect(test.notify).not.toHaveBeenCalled()
  expect(test.invalid).not.toHaveBeenCalled()
  expect(test.closed).not.toHaveBeenCalled()
})
