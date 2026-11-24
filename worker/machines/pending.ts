import type { HostOperation } from '../../src/shared/generated/HostOperation'
import type { HostResult } from '../../src/shared/generated/HostResult'
import {
  HOST_COMMAND_REPLY_MAX_BYTES,
  HOST_MAX_PENDING_REQUESTS,
  HOST_REPLY_MAX_BYTES,
} from '../../src/shared/host'
import type { HttpError } from '../http'
import { BoundedByteBuffer } from './byte-buffer'
import {
  hostError,
  machineBusy,
  machineDisconnected,
  machineHttpError,
  machineTimeout,
  replyOverflow,
} from './errors'

export const HOST_REQUEST_LIMIT_MS = 30_000

interface PendingRequest {
  operation: HostOperation
  budget: number
  resolve: (result: HostResult) => void
  reject: (error: HttpError) => void
  timer: ReturnType<typeof setTimeout>
  parts: BoundedByteBuffer
}

function command(operation: HostOperation): boolean {
  return operation.kind === 'command.run' || operation.kind === 'command.status'
}
function replyBudget(operation: HostOperation): number {
  if (command(operation)) return HOST_COMMAND_REPLY_MAX_BYTES
  return operation.kind === 'file.read'
    ? 4 * Math.ceil(operation.maxBytes / 3) + HOST_REPLY_MAX_BYTES
    : HOST_REPLY_MAX_BYTES
}
function matches(operation: HostOperation, result: HostResult): boolean {
  switch (operation.kind) {
    case 'command.run':
      return result.kind === 'command.result'
    case 'command.start':
      return result.kind === 'command.started'
    case 'command.status':
      return (
        result.kind === 'command.status' &&
        result.processId === operation.processId
      )
    case 'file.info':
      return result.kind === 'file.info' && result.path === operation.path
    case 'file.read':
      return (
        (result.kind === 'file.content' &&
          result.path === operation.path &&
          result.sizeBytes <= operation.maxBytes) ||
        (result.kind === 'file.too_large' &&
          result.limitBytes === operation.maxBytes)
      )
    case 'stream.open':
      return (
        result.kind === 'stream.opened' &&
        result.streamId === operation.streamId
      )
  }
}

export class PendingRequests {
  private readonly requests = new Map<number, PendingRequest>()
  private bytes = 0
  private readonly allocateId: () => number

  constructor(allocateId: () => number) {
    this.allocateId = allocateId
  }

  get bufferedBlocks(): number {
    let count = 0
    for (const request of this.requests.values())
      count += request.parts.blockCount
    return count
  }

  create(operation: HostOperation, deadline?: number) {
    if (this.requests.size >= HOST_MAX_PENDING_REQUESTS) throw machineBusy()
    const limit =
      operation.kind === 'command.run'
        ? (operation.timeoutSeconds + 10) * 1_000
        : operation.kind === 'stream.open'
          ? 15_000
          : HOST_REQUEST_LIMIT_MS
    const milliseconds =
      deadline === undefined ? limit : Math.min(limit, deadline - Date.now())
    if (milliseconds <= 0) throw machineTimeout()
    const id = this.allocateId()
    const budget = replyBudget(operation)
    const promise = new Promise<HostResult>((resolve, reject) => {
      const timer = setTimeout(
        () => this.fail(id, machineTimeout()),
        milliseconds,
      )
      this.requests.set(id, {
        operation,
        budget,
        resolve,
        reject,
        timer,
        parts: new BoundedByteBuffer(budget),
      })
    })
    return { id, promise }
  }

  reply(id: number, result: HostResult, bytes: number): void {
    const request = this.take(id)
    if (!request) return
    if (
      bytes > (result.kind === 'error' ? HOST_REPLY_MAX_BYTES : request.budget)
    )
      request.reject(
        replyOverflow(result.kind !== 'error' && command(request.operation)),
      )
    else if (result.kind === 'error') request.reject(hostError(result.code))
    else if (!matches(request.operation, result))
      request.reject(
        machineHttpError(
          502,
          'invalid_response',
          'The cloud computer response is not valid.',
        ),
      )
    else request.resolve(result)
  }

  part(id: number, data: Uint8Array, last: boolean): Uint8Array | null {
    const request = this.requests.get(id)
    if (!request) return null
    if (request.parts.byteLength + data.byteLength > request.budget) {
      this.fail(id, replyOverflow(command(request.operation)))
      return null
    }
    if (this.bytes + data.byteLength >= 2 * HOST_COMMAND_REPLY_MAX_BYTES)
      throw new Error('Host message assembly limit exceeded.')
    request.parts.append(data)
    this.bytes += data.byteLength
    if (!last) return null
    this.bytes -= request.parts.byteLength
    return request.parts.take()
  }

  fail(id: number, error: HttpError): void {
    this.take(id)?.reject(error)
  }
  disconnect(): void {
    for (const id of this.requests.keys()) this.fail(id, machineDisconnected())
  }
  private take(id: number): PendingRequest | undefined {
    const request = this.requests.get(id)
    if (request) {
      clearTimeout(request.timer)
      this.bytes -= request.parts.byteLength
      request.parts.clear()
      this.requests.delete(id)
    }
    return request
  }
}
