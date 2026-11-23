import { HOST_STREAM_FRAME_BYTES } from '../../src/shared/host'

export class BoundedByteBuffer {
  private readonly limit: number
  private blocks: Uint8Array[] = []
  private tailBytes = 0
  private size = 0

  constructor(limit: number) {
    this.limit = limit
  }

  get byteLength(): number {
    return this.size
  }

  get blockCount(): number {
    return this.blocks.length
  }

  append(bytes: Uint8Array): void {
    if (this.size + bytes.byteLength > this.limit)
      throw new RangeError('The byte buffer limit was exceeded.')
    let offset = 0
    while (offset < bytes.byteLength) {
      let tail = this.blocks.at(-1)
      if (!tail || this.tailBytes === HOST_STREAM_FRAME_BYTES) {
        tail = new Uint8Array(HOST_STREAM_FRAME_BYTES)
        this.blocks.push(tail)
        this.tailBytes = 0
      }
      const size = Math.min(
        bytes.byteLength - offset,
        HOST_STREAM_FRAME_BYTES - this.tailBytes,
      )
      tail.set(bytes.subarray(offset, offset + size), this.tailBytes)
      this.tailBytes += size
      this.size += size
      offset += size
    }
  }

  read(): Uint8Array | undefined {
    const block = this.blocks.shift()
    if (!block) return undefined
    const size = this.blocks.length ? HOST_STREAM_FRAME_BYTES : this.tailBytes
    this.size -= size
    if (!this.blocks.length) this.tailBytes = 0
    return size === block.byteLength ? block : block.subarray(0, size)
  }

  take(): Uint8Array {
    const bytes = new Uint8Array(this.size)
    let offset = 0
    for (let block = this.read(); block; block = this.read()) {
      bytes.set(block, offset)
      offset += block.byteLength
    }
    return bytes
  }

  clear(): void {
    this.blocks = []
    this.tailBytes = 0
    this.size = 0
  }
}
