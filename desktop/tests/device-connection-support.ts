import { vi } from 'vitest'

import {
  DEVICE_FRAME_LIMIT_BYTES,
  DEVICE_HEARTBEAT_MS,
  DEVICE_OUTPUT_LIMIT_BYTES,
} from '../../src/shared/device.ts'
import type { WorkerToDevice } from '../../src/shared/device.ts'
import { createDeviceConnection } from '../src/device/connection.js'
import type {
  DeviceAccount,
  DeviceCredential,
} from '../src/device/connection.js'
import type { SocketEvents } from '../src/device/transport.js'
import { fakeClock } from './device-support.js'

export const connected: WorkerToDevice = {
  type: 'device.connected',
  device: { deviceId: 'local-device', connectionId: 'connection-one' },
  outputLimitBytes: DEVICE_OUTPUT_LIMIT_BYTES,
  frameLimitBytes: DEVICE_FRAME_LIMIT_BYTES,
  heartbeatIntervalMs: DEVICE_HEARTBEAT_MS,
}

export function connectionFixture() {
  const time = fakeClock()
  const events: SocketEvents[] = []
  const sockets: {
    close: ReturnType<typeof vi.fn>
    send: ReturnType<typeof vi.fn>
  }[] = []
  const waiting: ((index: number) => void)[] = []
  let credential: DeviceCredential | undefined = {
    value: 'first.signature',
    expiresAt: time.clock.now() + 1_000_000,
  }
  const receive = vi.fn()
  const dispose = vi.fn()
  const warn = vi.fn()
  const authenticate = vi.fn<
    (value: string, signal: AbortSignal) => Promise<DeviceAccount | undefined>
  >(async () => ({ userId: 'user-one', appAccess: true }))
  const readCredential = vi.fn(async () => credential)
  const connect = vi.fn((_value: string, callbacks: SocketEvents) => {
    const socket = { close: vi.fn(), send: vi.fn(() => true) }
    sockets.push(socket)
    events.push(callbacks)
    waiting.shift()?.(sockets.length - 1)
    return socket
  })
  const session = vi.fn(() => ({ receive, dispose }))
  const connection = createDeviceConnection({
    deviceId: 'local-device',
    clock: time.clock,
    readCredential,
    authenticate,
    connect,
    session,
    warn,
  })
  return {
    ...time,
    connection,
    connect,
    readCredential,
    authenticate,
    events,
    sockets,
    session,
    receive,
    dispose,
    warn,
    setCredential: (value: DeviceCredential | undefined) => {
      credential = value
    },
    nextSocket: () =>
      new Promise<number>((resolve) => {
        waiting.push(resolve)
      }),
  }
}
