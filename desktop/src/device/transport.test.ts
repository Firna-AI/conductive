import { EventEmitter } from 'node:events'
import { expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'
import type { ClientOptions } from 'ws'

import {
  DEVICE_FRAME_LIMIT_BYTES,
  DEVICE_OUTPUT_LIMIT_BYTES,
  DEVICE_REPLACED_CLOSE_CODE,
  deviceConnectionPath,
} from '../../../src/shared/device.ts'
import {
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from '../../../worker/security/desktop-contract.js'
import { connected } from '../../tests/device-connection-support.js'
import { command } from '../../tests/device-support.js'
import { connectDevice } from './transport.js'

class Wire extends EventEmitter {
  readyState: WebSocket['readyState'] = WebSocket.OPEN
  bufferedAmount = 0
  send = vi.fn<(frame: string, callback: (error?: Error) => void) => void>()
  terminate = vi.fn()
}
function setup() {
  const wire = new Wire()
  const create = vi.fn<(url: URL, options: ClientOptions) => Wire>(() => wire)
  const message = vi.fn()
  const closed = vi.fn()
  const socket = connectDevice(
    {
      appOrigin: 'https://app.conducting.test',
      deviceId: 'local-device',
      deviceName: 'Cals Mac & Work.local',
      credential: 'fixture.signature',
      events: { message, closed },
    },
    create,
  )
  return { wire, create, message, closed, socket }
}

it('puts the main-process cookie only in authenticated upgrade headers and uses bounded frames', () => {
  const test = setup()
  const [url, options] = test.create.mock.calls[0]
  expect(url.href).toBe(
    'wss://app.conducting.test' +
      deviceConnectionPath('local-device', 'Cals Mac & Work.local'),
  )
  expect(url.searchParams.get('deviceName')).toBe('Cals Mac & Work.local')
  expect(url.href).not.toContain('fixture.signature')
  expect(options).toEqual({
    origin: DESKTOP_ORIGIN,
    headers: {
      Cookie: `${DESKTOP_SESSION_COOKIE}=fixture.signature`,
      Authorization: 'Bearer fixture.signature',
    },
    followRedirects: false,
    handshakeTimeout: 30_000,
    maxPayload: DEVICE_FRAME_LIMIT_BYTES,
    perMessageDeflate: false,
  })
  test.wire.emit('message', Buffer.from(JSON.stringify(connected)), false)
  expect(test.message).toHaveBeenCalledWith(connected)
  const input = {
    type: 'command.result' as const,
    workspaceId: 'workspace-one',
    requestId: 'request-one',
    result: {
      stdout: '\0'.repeat(DEVICE_OUTPUT_LIMIT_BYTES),
      stderr: '',
      exitCode: 0,
      timedOut: false,
      truncated: false,
    },
  }
  expect(test.socket.send(input)).toBe(true)
  const encoded = test.wire.send.mock.calls[0][0]
  expect(encoded).toBe(JSON.stringify(input))
  expect(Buffer.byteLength(String(encoded))).toBeLessThanOrEqual(
    DEVICE_FRAME_LIMIT_BYTES,
  )
  const longReference = { ...input, requestId: 'r'.repeat(900_000) }
  expect(test.socket.send(longReference)).toBe(true)
  const fitted = String(test.wire.send.mock.calls[1][0])
  expect(JSON.parse(fitted)).toEqual({
    ...longReference,
    result: { ...input.result, stdout: '\0'.repeat(16_641), truncated: true },
  })
  expect(Buffer.byteLength(fitted)).toBeLessThanOrEqual(
    DEVICE_FRAME_LIMIT_BYTES,
  )
})

it('closes on invalid JSON, missing workspace references, binary data, or oversized output', () => {
  for (const [frame, binary] of [
    ['{bad json', false],
    [
      JSON.stringify({ type: 'command.cancel', requestId: 'request-one' }),
      false,
    ],
    [
      JSON.stringify({
        type: 'command.approval',
        requestId: 'request-one',
        operationId: 'one',
        action: 'allow',
      }),
      false,
    ],
    [
      JSON.stringify({
        type: 'command.request',
        request: command({ state: 'running' }),
      }),
      false,
    ],
    [JSON.stringify(connected), true],
    [' '.repeat(DEVICE_FRAME_LIMIT_BYTES + 1), false],
  ] as const) {
    const test = setup()
    test.wire.emit('message', Buffer.from(frame), binary)
    expect(test.message).not.toHaveBeenCalled()
    expect(test.closed).toHaveBeenCalledWith(false)
    expect(test.wire.terminate).toHaveBeenCalledOnce()
  }
  const test = setup()
  expect(
    test.socket.send({
      type: 'settings.result',
      operationId: 'one',
      outcome: { status: 'done' },
      settings: {
        deviceName: 'Mac',
        alwaysAllowedCommands: ['\0'.repeat(DEVICE_FRAME_LIMIT_BYTES)],
        workspaceWindows: [],
      },
    }),
  ).toBe(false)
  expect(test.wire.send).not.toHaveBeenCalled()
  expect(test.closed).toHaveBeenCalledWith(false)
})

it('reports a rejected handshake once and stops when the send queue is full', () => {
  const test = setup()
  const destroy = vi.fn()
  test.wire.emit('unexpected-response', {}, { destroy, statusCode: 401 })
  test.wire.emit('error', new Error('private server error'))
  test.wire.emit('close')
  expect(destroy).toHaveBeenCalledOnce()
  expect(test.closed.mock.calls).toEqual([[true]])
  expect(test.socket.send({ type: 'device.ping' })).toBe(false)
  const slow = setup()
  slow.wire.bufferedAmount = DEVICE_FRAME_LIMIT_BYTES
  expect(slow.socket.send({ type: 'device.ping' })).toBe(false)
  expect(slow.wire.send).not.toHaveBeenCalled()
})

it('suspends replaced and unauthorized connections while leaving temporary failures retryable', () => {
  const replaced = setup()
  replaced.wire.emit('close', DEVICE_REPLACED_CLOSE_CODE)
  expect(replaced.closed.mock.calls).toEqual([[true]])
  for (const [statusCode, rejected] of [
    [401, true],
    [403, true],
    [429, false],
    [503, false],
  ] as const) {
    const test = setup()
    test.wire.emit('unexpected-response', {}, { destroy: vi.fn(), statusCode })
    expect(test.closed.mock.calls).toEqual([[rejected]])
  }
})
