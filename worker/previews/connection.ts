import { HttpError } from '../http'

/** One connection owns fetch cancellation and every streaming body in both directions. */
export class PreviewConnection {
  private readonly abort = new AbortController()
  private readonly authorize: () => Promise<void>
  private readonly release: () => void
  private readonly cancellation = new Set<() => void>()
  private parts = 1
  private closed = false
  private released = false

  constructor(authorize: () => Promise<void>, release: () => void) {
    this.authorize = authorize
    this.release = release
  }

  get signal(): AbortSignal {
    return this.abort.signal
  }

  watch(cancel: () => void): void {
    if (this.closed) cancel()
    else this.cancellation.add(cancel)
  }

  finishHeaders(): void {
    this.parts--
    this.finish()
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.abort.abort()
    for (const cancel of this.cancellation) cancel()
    this.cancellation.clear()
    this.detach()
  }

  private detach(): void {
    if (this.released) return
    this.released = true
    this.release()
  }

  private finish(): void {
    if (this.parts === 0) this.detach()
  }

  wrap(
    body: ReadableStream<Uint8Array> | null,
  ): ReadableStream<Uint8Array> | null {
    if (!body) return null
    const reader = body.getReader()
    let controller: ReadableStreamDefaultController<Uint8Array> | null = null
    let finished = false
    this.parts++
    const finish = () => {
      if (finished) return
      finished = true
      this.cancellation.delete(cancel)
      this.parts--
      this.finish()
    }
    const cancel = () => {
      if (finished) return
      controller?.error(
        new DOMException('The preview connection closed.', 'AbortError'),
      )
      void reader.cancel().catch(() => {})
      finish()
    }
    return new ReadableStream<Uint8Array>(
      {
        start: (value) => {
          controller = value
          this.watch(cancel)
        },
        pull: async (value) => {
          try {
            const next = await reader.read()
            if (finished) return
            if (next.done) {
              value.close()
              finish()
              return
            }
            await this.authorize()
            if (!finished && !this.closed) value.enqueue(next.value)
          } catch (error) {
            if (!(error instanceof HttpError) && !finished) {
              value.error(error)
              finish()
            }
            this.close()
          }
        },
        cancel: async () => {
          finish()
          await reader.cancel()
        },
      },
      { highWaterMark: 0 },
    )
  }
}
