import type { WorkerToHost } from '../../src/shared/generated/WorkerToHost'
import {
  HOST_STREAM_FRAME_BYTES,
  HOST_STREAM_WINDOW_BYTES,
} from '../../src/shared/host'
import { encodeHostFrame } from '../../src/shared/host-frames'
import { invalidRequest, machineDisconnected } from './errors'
import { BoundedByteBuffer } from './byte-buffer'

export interface MachineStream {
  readable: ReadableStream<Uint8Array>
  writable: WritableStream<Uint8Array>
}

export class HostStream {
  private readonly id: number
  private readonly send: (message: WorkerToHost | Uint8Array) => void
  private readonly remove: () => void
  readonly pair: MachineStream
  private controller!: ReadableStreamDefaultController<Uint8Array>
  private writableController!: WritableStreamDefaultController
  private readonly queue = new BoundedByteBuffer(HOST_STREAM_WINDOW_BYTES)
  private receiveCredit = HOST_STREAM_WINDOW_BYTES
  private ungranted = 0
  private sendCredit = HOST_STREAM_WINDOW_BYTES
  private reading = false
  private pulled?: () => void
  private readEnded = false
  private writeEnded = false
  private closed = false
  private readClosed = false
  private wake?: () => void

  constructor(
    id: number,
    send: (message: WorkerToHost | Uint8Array) => void,
    remove: () => void,
  ) {
    this.id = id
    this.send = send
    this.remove = remove
    this.pair = {
      readable: new ReadableStream<Uint8Array>(
        {
          start: (controller) => {
            this.controller = controller
          },
          pull: () =>
            new Promise<void>((resolve) => {
              this.pulled = resolve
              this.reading = true
              this.drain()
            }),
          cancel: () => this.close(),
        },
        { highWaterMark: 0 },
      ),
      writable: new WritableStream<Uint8Array>({
        start: (controller) => {
          this.writableController = controller
        },
        write: (bytes: unknown) => {
          if (bytes instanceof Uint8Array) return this.write(bytes)
          if (bytes instanceof ArrayBuffer)
            return this.write(new Uint8Array(bytes))
          throw invalidRequest()
        },
        close: () => {
          this.writeEnded = true
          this.send({ type: 'stream.end', streamId: this.id })
          this.finish()
        },
        abort: () => this.close(),
      }),
    }
  }

  data(bytes: Uint8Array): void {
    if (this.closed) return
    if (this.readEnded || bytes.byteLength > this.receiveCredit) {
      this.close()
      return
    }
    this.receiveCredit -= bytes.byteLength
    this.queue.append(bytes)
    this.drain()
  }
  get bufferedBlocks(): number {
    return this.queue.blockCount
  }
  credit(bytes: number): void {
    if (bytes > HOST_STREAM_WINDOW_BYTES - this.sendCredit) {
      this.close()
      return
    }
    this.sendCredit += bytes
    this.wake?.()
    this.wake = undefined
  }
  end(): void {
    this.readEnded = true
    this.drain()
  }
  close(notify = true): void {
    if (this.closed) return
    this.closed = true
    try {
      if (notify) this.send({ type: 'stream.close', streamId: this.id })
    } finally {
      if (!this.readClosed) this.controller.error(machineDisconnected())
      this.writableController.error(machineDisconnected())
      this.queue.clear()
      this.pulled?.()
      this.pulled = undefined
      this.wake?.()
      this.wake = undefined
      this.remove()
    }
  }

  private drain(): void {
    if (this.closed || this.readClosed) return
    const bytes = this.reading ? this.queue.read() : undefined
    if (bytes) {
      this.reading = false
      this.controller.enqueue(bytes)
      this.ungranted += bytes.byteLength
      if (this.ungranted >= HOST_STREAM_FRAME_BYTES) {
        const credit = this.ungranted
        this.ungranted = 0
        this.receiveCredit += credit
        this.send({ type: 'stream.credit', streamId: this.id, bytes: credit })
      }
      this.pulled?.()
      this.pulled = undefined
    }
    if (this.readEnded && !this.queue.byteLength) {
      this.readClosed = true
      this.controller.close()
      this.pulled?.()
      this.pulled = undefined
      this.finish()
    }
  }
  private finish(): void {
    if (this.readClosed && this.writeEnded) {
      this.closed = true
      this.remove()
    }
  }
  private async write(bytes: Uint8Array): Promise<void> {
    let offset = 0
    while (offset < bytes.byteLength) {
      if (this.closed) throw machineDisconnected()
      if (this.sendCredit === 0) {
        await new Promise<void>((resolve) => {
          this.wake = resolve
        })
        continue
      }
      const size = Math.min(
        bytes.byteLength - offset,
        this.sendCredit,
        HOST_STREAM_FRAME_BYTES,
      )
      this.send(
        encodeHostFrame({
          kind: 'streamData',
          streamId: this.id,
          data: bytes.subarray(offset, offset + size),
        }),
      )
      this.sendCredit -= size
      offset += size
    }
  }
}
