import { EventEmitter } from 'node:events'
import { vi } from 'vitest'
import { WebSocket } from 'ws'
import type { WorkerToDevice } from '../../../src/shared/device.ts'
import { readImportDeviceFrame } from '../../../src/shared/conductor-import-operation-read.ts'
import { connected } from '../../tests/device-connection-support.js'
import { fakeClock } from '../../tests/device-support.js'
import { controllerFixture } from '../import/controller.test-support.ts'
import { createDeviceConnection } from './connection.js'
import { createPermissionStore } from './permissions.js'
import { createDeviceSessionFactory } from './session-factory.js'
import { connectDevice } from './transport.js'

class HeldWire extends EventEmitter {
  readyState = WebSocket.OPEN
  bufferedAmount = 0
  frames: string[] = []
  callbacks: { bytes: number; complete(error?: Error): void }[] = []
  terminate = vi.fn()
  send(frame: string, callback: (error?: Error) => void) {
    const bytes = Buffer.byteLength(frame)
    this.frames.push(frame)
    this.bufferedAmount += bytes
    this.callbacks.push({ bytes, complete: callback })
  }
  flush() {
    const next = this.callbacks.shift()
    if (!next) throw new Error('No transport write is pending')
    this.bufferedAmount -= next.bytes
    next.complete()
  }
  types() {
    return this.frames.map((frame) => {
      const value: unknown = JSON.parse(frame)
      if (typeof value !== 'object' || value === null || !('type' in value))
        throw new Error('Invalid test frame')
      return value.type
    })
  }
  imports() {
    return this.frames.flatMap((frame) => {
      const value: unknown = JSON.parse(frame)
      return typeof value === 'object' &&
        value !== null &&
        'type' in value &&
        value.type === 'import.frame'
        ? [readImportDeviceFrame(value)]
        : []
    })
  }
}

export async function importTransportFixture() {
  const state = controllerFixture()
  state.prompt.mockResolvedValue(true)
  await state.preferences.allow()
  const time = fakeClock()
  const warn = vi.fn()
  const permissions = createPermissionStore({
    deviceName: 'Fixture Mac',
    files: state.files.files,
    userId: 'user-one',
    clock: time.clock,
    warn,
  })
  permissions.allowCommand('x'.repeat(800_000))
  permissions.dispose()
  const sessions = createDeviceSessionFactory({
    files: state.files.files,
    deviceName: 'Fixture Mac',
    clock: time.clock,
    launch: () => {
      throw new Error('No command expected')
    },
    notify: () => () => undefined,
    warn,
    imports: { preferences: state.preferences, jobs: state.jobs },
  })
  const wire = new HeldWire()
  const connection = createDeviceConnection({
    deviceId: 'local-device',
    clock: time.clock,
    readCredential: async () => ({
      value: 'fixture.signature',
      expiresAt: time.clock.now() + 1_000_000,
    }),
    authenticate: async () => ({ userId: 'user-one', appAccess: true }),
    connect: (credential, events) =>
      connectDevice(
        {
          appOrigin: 'https://app.conductive.test',
          deviceId: 'local-device',
          credential,
          events,
        },
        () => wire,
      ),
    session: sessions.session,
    warn,
  })
  await connection.start()
  const receive = (message: WorkerToDevice) =>
    wire.emit('message', Buffer.from(JSON.stringify(message)), false)
  receive(connected)
  return {
    ...state,
    ...time,
    wire,
    receive,
    warn,
    settle: () => new Promise<void>((resolve) => setImmediate(resolve)),
    dispose() {
      connection.stop()
      sessions.dispose()
      state.controller.dispose()
    },
  }
}
