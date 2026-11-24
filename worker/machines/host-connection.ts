import type { HostOperation } from '../../src/shared/generated/HostOperation'
import type { HostToWorker } from '../../src/shared/generated/HostToWorker'
import type { HostStreamPort } from '../../src/shared/generated/HostStreamPort'
import type { WorkerToHost } from '../../src/shared/generated/WorkerToHost'
import {
  HOST_MAX_OPEN_STREAMS,
  HOST_MESSAGE_PART_BYTES,
  HOST_REPLY_MAX_BYTES,
  HOST_REQUEST_MAX_BYTES,
} from '../../src/shared/host'
import { decodeHostFrame, encodeHostFrame } from '../../src/shared/host-frames'
import {
  invalidRequest,
  machineBusy,
  machineDisconnected,
  machineUnavailable,
} from './errors'
import { validateOperation } from './operations'
import { HOST_REQUEST_LIMIT_MS, PendingRequests } from './pending'
import { readHostMessage } from './protocol-reader'
import { HostStream, type MachineStream } from './stream'
import {
  SocketState,
  type MachineSocket,
  type SocketIdentity,
} from './socket-state'
import { StreamClosePermits, type StreamCloseStorage } from './stream-close'

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false })

/** A status read can wait for the machine's next welcomed connection. */
export class HostWelcomeWait {
  private readonly waiters = new Set<() => void>()

  async deadline(connected: boolean): Promise<number> {
    const deadline = Date.now() + HOST_REQUEST_LIMIT_MS
    if (!connected)
      await new Promise<void>((resolve, reject) => {
        const ready = () => {
          clearTimeout(timer)
          resolve()
        }
        const timer = setTimeout(() => {
          this.waiters.delete(ready)
          reject(machineUnavailable())
        }, HOST_REQUEST_LIMIT_MS)
        this.waiters.add(ready)
      })
    return deadline
  }

  welcomed(): void {
    for (const ready of this.waiters) ready()
    this.waiters.clear()
  }
}

export class HostConnection {
  readonly socket: MachineSocket
  private readonly pending: PendingRequests
  private readonly state: SocketState
  private readonly closes: StreamClosePermits
  private readonly streams = new Map<number, HostStream>()
  private disconnected = false

  constructor(
    socket: MachineSocket,
    identity: SocketIdentity,
    storage: StreamCloseStorage,
  ) {
    this.socket = socket
    this.state = new SocketState(socket, identity)
    this.pending = new PendingRequests(() => this.state.allocateId())
    this.closes = new StreamClosePermits(storage)
    if (identity.lastId === 0) this.closes.clear()
  }
  welcomed(): void {
    this.state.welcomed()
  }
  connected(): boolean {
    return (
      !this.disconnected &&
      this.state.ready &&
      this.socket.readyState === WebSocket.OPEN
    )
  }
  send(message: WorkerToHost | Uint8Array): void {
    try {
      this.socket.send(
        message instanceof Uint8Array ? message : JSON.stringify(message),
      )
    } catch {
      this.disconnect()
      throw machineDisconnected()
    }
  }
  request(operation: HostOperation, deadline?: number) {
    validateOperation(operation)
    if (!this.connected()) throw machineUnavailable()
    const request = this.pending.create(operation, deadline)
    const message: WorkerToHost = {
      type: 'request',
      requestId: request.id,
      operation,
    }
    const bytes = encoder.encode(JSON.stringify(message))
    if (bytes.byteLength > HOST_REQUEST_MAX_BYTES)
      this.pending.fail(request.id, invalidRequest())
    else {
      try {
        if (bytes.byteLength <= HOST_MESSAGE_PART_BYTES) this.send(message)
        else
          for (
            let offset = 0;
            offset < bytes.byteLength;
            offset += HOST_MESSAGE_PART_BYTES
          )
            this.send(
              encodeHostFrame({
                kind: 'messagePart',
                requestId: request.id,
                last: offset + HOST_MESSAGE_PART_BYTES >= bytes.byteLength,
                data: bytes.subarray(offset, offset + HOST_MESSAGE_PART_BYTES),
              }),
            )
      } catch {
        this.pending.fail(request.id, machineDisconnected())
      }
    }
    return request.promise
  }

  async open(port: HostStreamPort): Promise<MachineStream> {
    if (!this.connected()) throw machineUnavailable()
    if (this.streams.size >= HOST_MAX_OPEN_STREAMS) throw machineBusy()
    const id = this.state.allocateId()
    this.closes.add(id)
    const stream = new HostStream(
      id,
      (message) => {
        if (!(message instanceof Uint8Array) && message.type === 'stream.close')
          this.closeStream(message.streamId)
        else this.send(message)
      },
      () => this.streams.delete(id),
    )
    this.streams.set(id, stream)
    try {
      await this.request({ kind: 'stream.open', streamId: id, port })
      return stream.pair
    } catch (error) {
      stream.close(false)
      throw error
    }
  }

  receive(value: string | ArrayBuffer): HostToWorker | null {
    if (typeof value === 'string') {
      if (value.length > HOST_REPLY_MAX_BYTES)
        throw new Error('Inline host message too large.')
      const bytes = encoder.encode(value).byteLength
      if (bytes > HOST_REPLY_MAX_BYTES)
        throw new Error('Inline host message too large.')
      return this.message(value, bytes)
    }
    const frame = decodeHostFrame(new Uint8Array(value))
    if (!this.state.ready) throw new Error('Host hello required.')
    if (frame.kind === 'streamData') {
      const stream = this.streams.get(frame.streamId)
      if (stream) stream.data(frame.data)
      else this.closeStream(frame.streamId)
    } else {
      const bytes = this.pending.part(frame.requestId, frame.data, frame.last)
      if (bytes) {
        const message = this.message(
          decoder.decode(bytes),
          bytes.byteLength,
          frame.requestId,
        )
        if (message?.type !== 'reply') throw new Error('Expected a host reply.')
      }
    }
    return null
  }

  disconnect(): void {
    this.disconnected = true
    this.pending.disconnect()
    for (const stream of this.streams.values()) stream.close(false)
    this.streams.clear()
    this.closes.clear()
  }

  private closeStream(id: number): void {
    if (this.state.wasAllocated(id) && this.closes.take(id))
      this.send({ type: 'stream.close', streamId: id })
  }

  private message(
    text: string,
    bytes: number,
    expectedId?: number,
  ): HostToWorker {
    const value: unknown = JSON.parse(text)
    const message = readHostMessage(value)
    if (!message) throw new Error('Invalid host message.')
    if (!this.state.ready) {
      if (message.type !== 'hello') throw new Error('Host hello required.')
      return message
    }
    switch (message.type) {
      case 'hello':
        throw new Error('Duplicate host hello.')
      case 'ping':
        break
      case 'reply':
        if (expectedId !== undefined && expectedId !== message.requestId)
          throw new Error('Mismatched host reply.')
        if (
          message.result.kind === 'stream.opened' &&
          !this.streams.has(message.result.streamId)
        )
          this.closeStream(message.result.streamId)
        this.pending.reply(message.requestId, message.result, bytes)
        break
      default: {
        const stream = this.streams.get(message.streamId)
        if (!stream) {
          if (message.type !== 'stream.close')
            this.closeStream(message.streamId)
        } else if (message.type === 'stream.credit')
          stream.credit(message.bytes)
        else if (message.type === 'stream.end') stream.end()
        else stream.close(false)
      }
    }
    return message
  }
}
