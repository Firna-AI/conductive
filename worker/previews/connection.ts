import { HttpError } from '../http'

const FIRST_READ_BYTES = 16 * 1024
const MAX_READ_BYTES = 256 * 1024

interface BodyReader {
  read(): Promise<ReadableStreamReadResult<Uint8Array>>
  cancel(): Promise<void>
}

function byteReader(
  body: ReadableStream<Uint8Array>,
): ReadableStreamBYOBReader | null {
  try {
    return body.getReader({ mode: 'byob' })
  } catch {
    return null
  }
}

/**
 * Reads all data that waits, up to a limit, so that one access check covers it.
 * The default reader of a Workers fetch body gives at most 4 KB for each read.
 * A byte stream fills a larger buffer instead. The buffer doubles after each full read.
 */
function batchReader(body: ReadableStream<Uint8Array>): BodyReader {
  const reader = byteReader(body)
  if (!reader) return body.getReader()
  let size = FIRST_READ_BYTES
  return {
    read: async () => {
      const next = await reader.read(new Uint8Array(size))
      if (next.value?.byteLength === size)
        size = Math.min(size * 2, MAX_READ_BYTES)
      return next
    },
    cancel: () => reader.cancel(),
  }
}

/** One connection owns fetch cancellation and every streaming body in both directions. */
export class PreviewConnection {
  private readonly abort = new AbortController()
  private readonly authorize: () => Promise<void>
  private readonly release: () => void
  private readonly cancellation = new Set<() => void>()
  private parts = 1
  private closed = false
  private released = false
  private headersFinished = false
  failure: unknown
  private readonly authorizationFailed: (error: unknown) => void

  constructor(
    authorize: () => Promise<void>,
    release: () => void,
    authorizationFailed: (error: unknown) => void = () => {},
  ) {
    this.authorize = authorize
    this.release = release
    this.authorizationFailed = authorizationFailed
  }

  get signal(): AbortSignal {
    return this.abort.signal
  }

  watch(cancel: () => void): void {
    if (this.closed) cancel()
    else this.cancellation.add(cancel)
  }

  finishHeaders(): void {
    this.headersFinished = true
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
    const reader = batchReader(body)
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
          let authorizing = false
          try {
            const next = await reader.read()
            if (finished) return
            if (next.done) {
              value.close()
              finish()
              return
            }
            authorizing = true
            await this.authorize()
            if (!finished && !this.closed) value.enqueue(next.value)
          } catch (error) {
            if (authorizing) {
              this.failure = error
              if (this.headersFinished) this.authorizationFailed(error)
            }
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
