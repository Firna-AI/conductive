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
import { PendingRequests } from './pending'
import { readHostMessage } from './protocol-reader'
import { HostStream, type MachineStream } from './stream'
import {
  SocketState,
  type MachineSocket,
  type SocketIdentity,
} from './socket-state'

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false })

export class MachineChannel {
  readonly socket: MachineSocket
  private readonly pending: PendingRequests
  private readonly state: SocketState
  private readonly streams = new Map<number, HostStream>()
  private disconnected = false

  constructor(socket: MachineSocket, identity: SocketIdentity) {
    this.socket = socket
    this.state = new SocketState(socket, identity)
    this.pending = new PendingRequests(() => this.state.allocateId())
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
  request(operation: HostOperation) {
    validateOperation(operation)
    if (!this.connected()) throw machineUnavailable()
    const request = this.pending.create(operation)
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
    const stream = new HostStream(
      id,
      (message) => this.send(message),
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
      else this.send({ type: 'stream.close', streamId: frame.streamId })
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
          this.send({ type: 'stream.close', streamId: message.result.streamId })
        this.pending.reply(message.requestId, message.result, bytes)
        break
      default: {
        const stream = this.streams.get(message.streamId)
        if (!stream) {
          if (message.type !== 'stream.close')
            this.send({ type: 'stream.close', streamId: message.streamId })
        } else if (message.type === 'stream.credit')
          stream.credit(message.bytes)
        else if (message.type === 'stream.end') stream.end()
        else stream.close(false)
      }
    }
    return message
  }
}
