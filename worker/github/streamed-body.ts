const CHUNK_BYTES = 64 * 1024

/** A JSON object followed by streamed whitespace, without a full-body fixture. */
export class StreamedBody {
  readBytes = 0
  cancelled = false
  readonly stream: ReadableStream<Uint8Array>

  constructor(byteLength: number) {
    this.stream = new ReadableStream(
      {
        pull: (controller) => {
          if (this.readBytes === byteLength) {
            controller.close()
            return
          }
          const chunk = new Uint8Array(
            Math.min(CHUNK_BYTES, byteLength - this.readBytes),
          ).fill(32)
          if (this.readBytes === 0) {
            chunk[0] = 123
            chunk[1] = 125
          }
          this.readBytes += chunk.byteLength
          controller.enqueue(chunk)
        },
        cancel: () => {
          this.cancelled = true
        },
      },
      { highWaterMark: 0 },
    )
  }
}
