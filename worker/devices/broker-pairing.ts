import type { DeviceConnection } from './broker-types'
import { readDevicePairing } from '../../src/shared/device-read'
import { HttpError } from '../http'

export function requireDevicePairing(
  connection: DeviceConnection | null,
  value: unknown,
  userId: string,
  sessionId: string,
): DeviceConnection {
  const pairing = readDevicePairing(value)
  if (
    !connection ||
    connection.userId !== userId ||
    connection.sessionId !== sessionId ||
    connection.device.connectionId !== pairing.connectionId ||
    connection.device.deviceId !== pairing.deviceId
  )
    throw new HttpError(
      403,
      'device_forbidden',
      'Open this request on the connected Mac.',
    )
  return connection
}
