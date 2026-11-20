import type {
  DeviceSettings,
  DeviceSettingsOperation,
} from '../../src/shared/device'
import { HttpError } from '../http'
import type { DeviceConnection, SettingsWaiter } from './broker-types'
import { workspaceMacAccessPeriods } from './mac-access-data'

export async function currentDeviceSettings(
  db: D1Database,
  settings: DeviceSettings,
): Promise<DeviceSettings> {
  const periods = await workspaceMacAccessPeriods(
    db,
    settings.workspaceWindows.map(({ workspaceId }) => workspaceId),
  )
  return {
    ...settings,
    workspaceWindows: settings.workspaceWindows.filter((window) => {
      const current = periods.get(window.workspaceId)
      return (
        window.macAccessPeriod === undefined ||
        (current !== undefined && window.macAccessPeriod >= current)
      )
    }),
  }
}

export function relayDeviceSettings(
  settings: Map<string, SettingsWaiter>,
  connection: DeviceConnection,
  operation: DeviceSettingsOperation,
) {
  const operationId = crypto.randomUUID()
  return new Promise<import('../../src/shared/device').DeviceSettingsResponse>(
    (resolve, reject) => {
      const timer = setTimeout(() => {
        settings.delete(operationId)
        reject(
          new HttpError(409, 'device_unavailable', 'The Mac is not available.'),
        )
      }, 10_000)
      settings.set(operationId, {
        connectionId: connection.device.connectionId,
        resolve,
        reject,
        cancel: () => clearTimeout(timer),
      })
      try {
        connection.send({ type: 'settings.operation', operationId, operation })
      } catch {
        clearTimeout(timer)
        settings.delete(operationId)
        reject(
          new HttpError(409, 'device_unavailable', 'The Mac is not available.'),
        )
      }
    },
  )
}
