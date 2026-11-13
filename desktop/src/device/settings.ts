import type {
  DeviceSettingsOutcome,
  DeviceToWorker,
  WorkerToDevice,
} from '../../../src/shared/device.ts'
import { deviceFrame } from './frame.js'
import type { PermissionStore } from './permissions.js'

interface SettingsDependencies {
  permissions: PermissionStore
  send(message: DeviceToWorker): boolean
  warn(): void
}

export function applyDeviceSettings(
  message: Extract<WorkerToDevice, { type: 'settings.operation' }>,
  dependencies: SettingsDependencies,
): void {
  let outcome: DeviceSettingsOutcome = { status: 'done' }
  try {
    const operation = message.operation
    if (operation.action === 'remove-command')
      outcome = dependencies.permissions.removeCommand(operation.command)
    if (operation.action === 'stop-workspace')
      outcome = dependencies.permissions.stopWorkspace(operation.workspaceId)
    if (operation.action === 'keep-workspace')
      outcome = dependencies.permissions.keepWorkspace(operation.workspaceId)
  } catch {
    dependencies.warn()
    outcome = {
      status: 'failed',
      message: 'The Mac could not change this permission. Try again.',
    }
  }
  const result: DeviceToWorker = {
    type: 'settings.result',
    operationId: message.operationId,
    settings: dependencies.permissions.settings(),
    outcome,
  }
  dependencies.send(
    deviceFrame(result) === undefined
      ? {
          type: 'settings.failed',
          operationId: message.operationId,
          code: 'settings_result_too_large',
        }
      : result,
  )
}
