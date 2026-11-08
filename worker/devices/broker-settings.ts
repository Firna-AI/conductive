import type { DeviceSettingsAction } from '../../src/shared/device'
import { HttpError } from '../http'
import type { DeviceConnection, SettingsWaiter } from './broker-types'

export function relayDeviceSettings(
  settings: Map<string, SettingsWaiter>,
  connection: DeviceConnection,
  operation: DeviceSettingsAction,
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
