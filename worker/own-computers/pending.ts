import {
  COMPUTER_MAX_PENDING_REQUESTS,
  COMPUTER_REPLY_MAX_BYTES,
} from '../../src/shared/computer'
import type { ComputerOperation } from '../../src/shared/generated/ComputerOperation'
import type { ComputerResult } from '../../src/shared/generated/ComputerResult'
import { HttpError } from '../http'
import { BoundedByteBuffer } from '../machines/byte-buffer'
import {
  computerBusy,
  computerDisconnected,
  computerError,
  computerReplyTooLarge,
  invalidComputerReply,
} from './errors'
import { matchComputerReply, type ComputerSuccess } from './operations'

interface PendingRequest {
  matches: (result: ComputerSuccess) => boolean
  resolve: (result: ComputerSuccess) => void
  reject: (error: HttpError) => void
  timer: ReturnType<typeof setTimeout>
  parts: BoundedByteBuffer
}

function deadline(operation: ComputerOperation) {
  switch (operation.kind) {
    case 'container.create':
    case 'image.save':
    case 'container.bootstrap':
      return 15 * 60_000
    default:
      return 60_000
  }
}

export class PendingComputerRequests {
  private readonly requests = new Map<number, PendingRequest>()
  private bufferedBytes = 0

  start(id: number, operation: ComputerOperation) {
    if (this.requests.size >= COMPUTER_MAX_PENDING_REQUESTS)
      throw computerBusy()
    return new Promise<ComputerSuccess>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.take(id)?.reject(
          new HttpError(
            504,
            'computer_timeout',
            'The own computer did not answer. Try again.',
          ),
        )
      }, deadline(operation))
      this.requests.set(id, {
        matches: matchComputerReply(operation),
        resolve,
        reject,
        timer,
        parts: new BoundedByteBuffer(COMPUTER_REPLY_MAX_BYTES),
      })
    })
  }

  reply(id: number, result: ComputerResult): void {
    const request = this.take(id)
    if (!request) return
    if (result.kind === 'error') request.reject(computerError(result.code))
    else if (!request.matches(result)) request.reject(invalidComputerReply())
    else request.resolve(result)
  }

  part(id: number, data: Uint8Array, last: boolean): Uint8Array | null {
    const parts = this.requests.get(id)?.parts
    if (!parts) return null
    if (
      parts.byteLength + data.byteLength > COMPUTER_REPLY_MAX_BYTES ||
      this.bufferedBytes + data.byteLength > 2 * COMPUTER_REPLY_MAX_BYTES
    ) {
      this.take(id)?.reject(computerReplyTooLarge())
      return null
    }
    parts.append(data)
    this.bufferedBytes += data.byteLength
    if (!last) return null
    this.bufferedBytes -= parts.byteLength
    return parts.take()
  }

  disconnect(error = computerDisconnected()): void {
    for (const id of this.requests.keys()) this.take(id)?.reject(error)
  }

  private take(id: number): PendingRequest | undefined {
    const request = this.requests.get(id)
    if (request) {
      clearTimeout(request.timer)
      this.bufferedBytes -= request.parts.byteLength
      request.parts.clear()
      this.requests.delete(id)
    }
    return request
  }
}
