import type {
  DeviceSettings,
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
): DeviceSettingsOutcome {
  const failed: DeviceSettingsOutcome = {
    status: 'failed',
    message: 'The Mac could not change this permission. Try again.',
  }
  const reply = (
    settings: DeviceSettings,
    outcome: DeviceSettingsOutcome,
  ): Extract<DeviceToWorker, { type: 'settings.result' }> => ({
    type: 'settings.result',
    operationId: message.operationId,
    settings,
    outcome,
  })
  const tooLarge = (): DeviceSettingsOutcome => {
    dependencies.send({
      type: 'settings.failed',
      operationId: message.operationId,
      code: 'settings_result_too_large',
    })
    return failed
  }
  let outcome: DeviceSettingsOutcome = { status: 'done' }
  try {
    const operation = message.operation
    if (
      operation.action === 'start-workspace-until-stop' ||
      operation.action === 'keep-workspace' ||
      operation.action === 'extend-workspace'
    ) {
      const prepared = dependencies.permissions.prepareWorkspace(operation)
      let result = reply(prepared.settings, prepared.outcome)
      if (deviceFrame(result) === undefined) return tooLarge()
      if (operation.action === 'extend-workspace') {
        // Extend must save before it can report done. A failed save keeps
        // the old grant and timer, and its reply carries those settings.
        outcome = prepared.commit()
        result = reply(dependencies.permissions.settings(), outcome)
        if (deviceFrame(result) === undefined) return tooLarge()
      }
      if (!dependencies.send(result)) return failed
      return operation.action === 'extend-workspace'
        ? outcome
        : prepared.commit()
    }
    if (operation.action === 'remove-command')
      outcome = dependencies.permissions.removeCommand(operation.command)
    if (operation.action === 'stop-workspace')
      outcome = dependencies.permissions.stopWorkspace(operation.workspaceId)
  } catch {
    dependencies.warn()
    outcome = failed
  }
  const result = reply(dependencies.permissions.settings(), outcome)
  if (deviceFrame(result) === undefined) return tooLarge()
  return dependencies.send(result) ? outcome : failed
}
