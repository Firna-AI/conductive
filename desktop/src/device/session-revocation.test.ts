import { expect, it } from 'vitest'

import type { DeviceSettingsAction } from '../../../src/shared/device.ts'
import { deviceSettingsFixture } from '../../tests/device-settings-support.js'
import { command } from '../../tests/device-support.js'
import type { PermissionStore } from './permissions.js'

const cases: {
  action: string
  operation: DeviceSettingsAction
  revokedCommand: string
  allow(permissions: PermissionStore): void
}[] = [
  {
    action: 'Remove',
    operation: { action: 'remove-command', command: 'printf hello\n' },
    revokedCommand: 'printf hello\n',
    allow: (permissions) => permissions.allowCommand('printf hello\n'),
  },
  {
    action: 'Stop',
    operation: { action: 'stop-workspace', workspaceId: 'workspace-one' },
    revokedCommand: 'printf needs approval',
    allow: (permissions) =>
      permissions.allowWorkspace('workspace-one', 'Checkout address'),
  },
]

it.each(cases)(
  '$action revokes before a failed save and keeps other permissions and commands working',
  async ({ operation, revokedCommand, allow }) => {
    const test = deviceSettingsFixture()
    allow(test.permissions)
    test.permissions.allowCommand('printf hello')
    test.permissions.allowWorkspace('workspace-two', 'Other workspace')
    test.receive({
      type: 'command.request',
      request: command({
        requestId: 'already-running',
        command: revokedCommand,
      }),
    })
    expect(test.processes).toHaveLength(1)
    const atSave: { permitted: boolean; timers: number }[] = []
    test.files.write = () => {
      atSave.push({
        permitted: test.permissions.permits(revokedCommand, 'workspace-one'),
        timers: test.timers.size,
      })
      throw new Error('/private/account/permission-file: disk full')
    }
    test.receive({
      type: 'settings.operation',
      operationId: 'revoke-not-saved',
      operation,
    })
    const settings = {
      deviceName: 'Cals-Mac.local',
      alwaysAllowedCommands: ['printf hello'],
      workspaceWindows: [
        {
          workspaceId: 'workspace-two',
          workspaceName: 'Other workspace',
          expiresAt: 1_800_000_900_000,
        },
      ],
    }
    expect(test.messages().at(-1)).toEqual({
      type: 'settings.result',
      operationId: 'revoke-not-saved',
      settings,
      outcome: {
        status: 'done-not-saved',
        message:
          'This permission change is active, but the Mac could not save it. Try again.',
      },
    })
    expect(atSave).toEqual([{ permitted: false, timers: 2 }])
    expect(test.warn).toHaveBeenCalledOnce()
    expect(test.processes[0].kill).not.toHaveBeenCalled()
    const restored = test.openPermissions()
    expect(restored.permits(revokedCommand, 'workspace-one')).toBe(true)
    restored.dispose()

    test.receive({
      type: 'settings.operation',
      operationId: 'read-after-failed-save',
      operation: { action: 'read' },
    })
    expect(test.messages().at(-1)).toEqual({
      type: 'settings.result',
      operationId: 'read-after-failed-save',
      settings,
      outcome: { status: 'done' },
    })
    test.receive({
      type: 'command.request',
      request: command({
        requestId: 'needs-new-approval',
        command: revokedCommand,
      }),
    })
    expect(test.notify).toHaveBeenCalledOnce()
    expect(test.processes).toHaveLength(1)
    test.receive({
      type: 'command.request',
      request: command({ requestId: 'still-allowed', command: 'printf hello' }),
    })
    test.receive({
      type: 'command.request',
      request: command({
        requestId: 'other-workspace',
        workspaceId: 'workspace-two',
        command: 'printf other',
      }),
    })
    expect(test.processes).toHaveLength(3)
    test.processes[1].events.stdout(Buffer.from('permission kept'))
    test.processes[1].events.close(0)
    await Promise.resolve()
    expect(test.messages().at(-1)).toEqual({
      type: 'command.result',
      workspaceId: 'workspace-one',
      requestId: 'still-allowed',
      result: {
        stdout: 'permission kept',
        stderr: '',
        exitCode: 0,
        timedOut: false,
        truncated: false,
      },
    })
    test.receive({
      type: 'command.cancel',
      workspaceId: 'workspace-one',
      requestId: 'already-running',
    })
    expect(test.processes[0].kill).toHaveBeenCalledOnce()
    expect(test.processes[2].kill).not.toHaveBeenCalled()
    expect(test.invalid).not.toHaveBeenCalled()
    expect(test.closed).not.toHaveBeenCalled()
  },
)
