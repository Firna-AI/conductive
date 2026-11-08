import type { ClientRequest, IncomingMessage } from 'node:http'
import { WebSocket } from 'ws'
import type { ClientOptions, RawData } from 'ws'

import {
  DEVICE_FRAME_LIMIT_BYTES,
  DEVICE_LEASE_MS,
  DEVICE_REPLACED_CLOSE_CODE,
  deviceConnectionPath,
} from '../../../src/shared/device.ts'
import type {
  DeviceToWorker,
  WorkerToDevice,
} from '../../../src/shared/device.ts'
import {
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from '../../../worker/security/desktop-contract.js'
import { workerMessage } from './messages.js'
import { deviceFrame } from './frame.js'

export interface DeviceSocket {
  send(message: DeviceToWorker): boolean
  close(): void
}
export interface SocketEvents {
  message(message: WorkerToDevice): void
  closed(rejected: boolean): void
}
export interface TransportInput {
  appOrigin: string
  deviceId: string
  deviceName?: string
  credential: string
  events: SocketEvents
}
interface SocketWire {
  readonly readyState: number
  readonly bufferedAmount: number
  send(frame: string, callback: (error?: Error) => void): void
  terminate(): void
  on(
    event: 'message',
    callback: (data: RawData, binary: boolean) => void,
  ): unknown
  on(event: 'close', callback: (code: number) => void): unknown
  on(event: 'error', callback: () => void): unknown
  on(
    event: 'unexpected-response',
    callback: (request: ClientRequest, response: IncomingMessage) => void,
  ): unknown
}

/** Credentials belong only in these main-process upgrade headers. */
export function connectDevice(
  input: TransportInput,
  create: (url: URL, options: ClientOptions) => SocketWire = (url, options) =>
    new WebSocket(url, options),
): DeviceSocket {
  const url = new URL(
    deviceConnectionPath(input.deviceId, input.deviceName),
    input.appOrigin,
  )
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  const socket = create(url, {
    origin: DESKTOP_ORIGIN,
    headers: {
      Cookie: `${DESKTOP_SESSION_COOKIE}=${input.credential}`,
      Authorization: `Bearer ${input.credential}`,
    },
    followRedirects: false,
    handshakeTimeout: DEVICE_LEASE_MS,
    maxPayload: DEVICE_FRAME_LIMIT_BYTES,
    perMessageDeflate: false,
  })
  let closed = false
  const end = (rejected = false) => {
    if (closed) return
    closed = true
    input.events.closed(rejected)
    socket.terminate()
  }
  socket.on('unexpected-response', (_request, response) => {
    end(response.statusCode === 401 || response.statusCode === 403)
    response.destroy()
  })
  socket.on('error', () => end())
  socket.on('close', (code) => end(code === DEVICE_REPLACED_CLOSE_CODE))
  socket.on('message', (data, binary) => {
    if (closed) return
    if (binary) {
      end()
      return
    }
    const bytes = Array.isArray(data)
      ? Buffer.concat(data)
      : data instanceof ArrayBuffer
        ? Buffer.from(new Uint8Array(data))
        : data
    const message = workerMessage(bytes.toString('utf8'))
    if (!message) {
      end()
      return
    }
    input.events.message(message)
  })
  return {
    send(message) {
      const frame = deviceFrame(message)
      if (frame === undefined) {
        end()
        return false
      }
      const size = Buffer.byteLength(frame)
      if (
        closed ||
        socket.readyState !== WebSocket.OPEN ||
        size > DEVICE_FRAME_LIMIT_BYTES ||
        socket.bufferedAmount + size > DEVICE_FRAME_LIMIT_BYTES
      ) {
        end()
        return false
      }
      try {
        socket.send(frame, (error) => {
          if (error) end()
        })
        return true
      } catch {
        end()
        return false
      }
    },
    close: () => end(),
  }
}
