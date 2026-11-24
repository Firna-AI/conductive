import {
  COMPUTER_MESSAGE_PART_BYTES,
  COMPUTER_PROTOCOL_VERSION,
  COMPUTER_REPLY_MAX_BYTES,
  COMPUTER_REQUEST_MAX_BYTES,
} from '../../src/shared/computer'
import type { ComputerOperation } from '../../src/shared/generated/ComputerOperation'
import type { WorkerToComputer } from '../../src/shared/generated/WorkerToComputer'
import { decodeHostFrame, encodeHostFrame } from '../../src/shared/host-frames'
import { isRecord, type HttpError } from '../http'
import {
  computerBusy,
  computerOffline,
  computerReplyTooLarge,
  invalidComputerReply,
  invalidOperation,
} from './errors'
import { maxRequestId } from './operations'
import { PendingComputerRequests } from './pending'
import { readComputerHello, readComputerReply } from './protocol-reader'
import type { ComputerSocketState } from './socket-state'

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false })

export class ComputerChannel {
  readonly socket: WebSocket
  readonly identity: ComputerSocketState
  private readonly pending = new PendingComputerRequests()

  constructor(socket: WebSocket, identity: ComputerSocketState) {
    this.socket = socket
    this.identity = identity
  }

  connected() {
    return this.identity.ready && this.socket.readyState === WebSocket.OPEN
  }

  welcome() {
    this.send({
      type: 'welcome',
      computerProtocolVersion: COMPUTER_PROTOCOL_VERSION,
    })
    this.identity.ready = true
    this.socket.serializeAttachment(this.identity)
  }

  request(operation: ComputerOperation) {
    if (!this.connected()) throw computerOffline()
    if (this.identity.lastId === maxRequestId) throw computerBusy()
    const id = this.identity.lastId + 1
    const message: WorkerToComputer = {
      type: 'request',
      requestId: id,
      operation,
    }
    const text = JSON.stringify(message)
    if (text.length > COMPUTER_REQUEST_MAX_BYTES) throw invalidOperation()
    const bytes = encoder.encode(text)
    if (bytes.byteLength > COMPUTER_REQUEST_MAX_BYTES) throw invalidOperation()
    this.identity.lastId = id
    this.socket.serializeAttachment(this.identity)
    const reply = this.pending.start(id, operation)
    try {
      if (bytes.byteLength <= COMPUTER_MESSAGE_PART_BYTES)
        this.socket.send(text)
      else
        for (
          let offset = 0;
          offset < bytes.byteLength;
          offset += COMPUTER_MESSAGE_PART_BYTES
        ) {
          const end = offset + COMPUTER_MESSAGE_PART_BYTES
          this.socket.send(
            encodeHostFrame({
              kind: 'messagePart',
              requestId: id,
              data: bytes.subarray(offset, end),
              last: end >= bytes.byteLength,
            }),
          )
        }
    } catch {
      this.close(1011)
    }
    return reply
  }

  receive(value: string | ArrayBuffer) {
    if (typeof value === 'string') {
      if (
        value.length > COMPUTER_REPLY_MAX_BYTES ||
        encoder.encode(value).byteLength > COMPUTER_REPLY_MAX_BYTES
      )
        throw computerReplyTooLarge()
      const message: unknown = JSON.parse(value)
      if (!this.identity.ready) {
        const hello = readComputerHello(message)
        if (!hello) throw invalidComputerReply()
        return hello
      }
      if (isRecord(message) && message.type === 'ping')
        this.send({ type: 'pong' })
      else this.reply(message)
      return null
    }
    if (
      !this.identity.ready ||
      value.byteLength > COMPUTER_MESSAGE_PART_BYTES + 6
    )
      throw invalidComputerReply()
    const frame = decodeHostFrame(new Uint8Array(value))
    if (frame.kind !== 'messagePart') throw invalidComputerReply()
    const bytes = this.pending.part(frame.requestId, frame.data, frame.last)
    if (bytes) this.reply(JSON.parse(decoder.decode(bytes)), frame.requestId)
    return null
  }

  close(code: number, error?: HttpError): void {
    this.pending.disconnect(error)
    if (this.socket.readyState !== WebSocket.CLOSED)
      this.socket.close(code, 'The connection is no longer available.')
  }

  private reply(value: unknown, expectedId?: number): void {
    const reply = readComputerReply(value)
    if (!reply || (expectedId !== undefined && expectedId !== reply.requestId))
      throw invalidComputerReply()
    this.pending.reply(reply.requestId, reply.result)
  }

  private send(message: WorkerToComputer): void {
    this.socket.send(JSON.stringify(message))
  }
}
