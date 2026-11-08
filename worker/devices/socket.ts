import {
  DEVICE_FRAME_LIMIT_BYTES,
  type WorkerToDevice,
} from '../../src/shared/device'
import { DeviceContractError } from '../../src/shared/device-read'

export function deviceWire(message: WorkerToDevice): string {
  const text = JSON.stringify(message)
  if (new TextEncoder().encode(text).byteLength > DEVICE_FRAME_LIMIT_BYTES)
    throw new DeviceContractError('The Mac request is too large.')
  return text
}
export function deviceFrame(value: unknown): unknown {
  if (
    typeof value !== 'string' ||
    new TextEncoder().encode(value).byteLength > DEVICE_FRAME_LIMIT_BYTES
  )
    throw new DeviceContractError('The Mac reply is too large.')
  return JSON.parse(value)
}
