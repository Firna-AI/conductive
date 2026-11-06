export type Packet =
  | { kind: 'data'; data: Uint8Array<ArrayBuffer> }
  | { kind: 'flush' }
  | { kind: 'end' }

/** One packet is at most 65,520 bytes, independent of repository size. */
export class PacketReader {
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>
  private pending: Uint8Array = new Uint8Array(0)
  private offset = 0

  constructor(body: ReadableStream<Uint8Array>) {
    this.reader = body.getReader()
  }

  async packet(): Promise<Packet> {
    const header = await this.exactly(4)
    if (!header) return { kind: 'end' }
    const text = new TextDecoder().decode(header)
    if (!/^[0-9a-f]{4}$/iu.test(text)) throw new Error('Invalid Git packet')
    const length = Number.parseInt(text, 16)
    if (length === 0) return { kind: 'flush' }
    if (length < 4 || length > 65_520) throw new Error('Invalid Git packet')
    const data = await this.exactly(length - 4)
    if (!data) throw new Error('Incomplete Git packet')
    return { kind: 'data', data }
  }

  async *remaining(): AsyncGenerator<Uint8Array> {
    if (this.offset < this.pending.length)
      yield this.pending.subarray(this.offset)
    this.pending = new Uint8Array(0)
    this.offset = 0
    while (true) {
      const next = await this.reader.read()
      if (next.done) return
      if (next.value.length) yield next.value
    }
  }

  async close(): Promise<void> {
    try {
      await this.reader.cancel()
    } finally {
      this.reader.releaseLock()
    }
  }

  private async exactly(
    length: number,
  ): Promise<Uint8Array<ArrayBuffer> | null> {
    const result = new Uint8Array(length)
    let filled = 0
    while (filled < length) {
      if (this.offset === this.pending.length) {
        const next = await this.reader.read()
        if (next.done) {
          if (filled === 0) return null
          throw new Error('Incomplete Git packet')
        }
        this.pending = next.value
        this.offset = 0
      }
      const count = Math.min(length - filled, this.pending.length - this.offset)
      result.set(
        this.pending.subarray(this.offset, this.offset + count),
        filled,
      )
      this.offset += count
      filled += count
    }
    return result
  }
}

export function packetText(packet: Packet): string {
  if (packet.kind !== 'data') throw new Error('Missing Git packet')
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
    .decode(packet.data)
    .replace(/\n$/u, '')
}

export function encodePacket(value: string): string {
  return (
    (new TextEncoder().encode(value).length + 4).toString(16).padStart(4, '0') +
    value
  )
}
