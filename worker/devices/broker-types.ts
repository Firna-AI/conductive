import type {
  DeviceCommandRecord,
  DevicePairing,
  DeviceSettingsResponse,
  WorkerToDevice,
} from '../../src/shared/device'

export interface DeviceConnection {
  device: DevicePairing
  deviceName: string | null
  userId: string
  sessionId: string
  lastSeen: number
  send(message: WorkerToDevice): void
  close(code?: number, reason?: string): void
}
export interface BrokerRequest {
  request: DeviceCommandRecord
  tokenHash: string
  sessionId: string
  executionDeadline: number | null
}
export interface SettingsWaiter {
  connectionId: string
  resolve(value: DeviceSettingsResponse): void
  reject(error: Error): void
  cancel(): void
}
