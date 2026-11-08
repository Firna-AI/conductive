import type { WorkspaceChat } from '../chat/backend'

function readiness() {
  let resolve: () => void = () => {
    throw new Error('Readiness is not initialized')
  }
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

class BodyReadRequest extends Request {
  private readonly started = readiness()
  readonly reading = this.started.promise

  override json<T = unknown>(): Promise<T> {
    this.started.resolve()
    return super.json<T>()
  }
}

/** Observe the real parser entry, then supply the actual stream bytes on release. */
export function heldJsonBody(base: Request, value: unknown) {
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined
  const body = new ReadableStream<Uint8Array>(
    {
      start(stream) {
        controller = stream
      },
    },
    { highWaterMark: 0 },
  )
  const init = { body, duplex: 'half' as const }
  const request = new BodyReadRequest(base, init)
  return {
    request,
    reading: request.reading,
    release() {
      if (!controller) throw new Error('The body stream is missing')
      controller.enqueue(new TextEncoder().encode(JSON.stringify(value)))
      controller.close()
    },
  }
}

/** Forward to the real queue and signal only after the next task is enqueued. */
export function observeNextQueuedTask(chat: WorkspaceChat) {
  const entered = readiness()
  const original = chat.store.run
  const run = original.bind(chat.store)
  let observed = false
  chat.store.run = <T>(work: () => Promise<T>): Promise<T> => {
    const result = run(work)
    if (!observed) {
      observed = true
      entered.resolve()
    }
    return result
  }
  return {
    queued: entered.promise,
    restore() {
      chat.store.run = original
    },
  }
}
