import { expect, vi } from 'vitest'

export function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error('The promise is not initialized.')
  }
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

export function fakeProviderTimers() {
  vi.useFakeTimers()
  vi.spyOn(AbortSignal, 'timeout').mockImplementation((milliseconds) => {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), milliseconds)
    return controller.signal
  })
}

export function stalledReply(
  request: Request,
  status = 200,
  headers: HeadersInit = { 'Retry-After': '7' },
) {
  const reading = deferred<void>()
  const signal = request.signal
  const abort = () =>
    controller.error(
      new DOMException('The body read was aborted.', 'AbortError'),
    )
  let controller: ReadableStreamDefaultController<Uint8Array>
  const response = new Response(
    new ReadableStream<Uint8Array>(
      {
        start(current) {
          controller = current
          current.enqueue(new TextEncoder().encode('{'))
          signal.addEventListener('abort', abort, { once: true })
        },
        pull() {
          reading.resolve()
        },
        cancel() {
          signal.removeEventListener('abort', abort)
        },
      },
      { highWaterMark: 0 },
    ),
    { status, headers },
  )
  return { response, signal, reading: reading.promise }
}

export type StalledReply = ReturnType<typeof stalledReply>

export function brokenReply(error: Error) {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(error)
      },
    }),
  )
}

export function outcome<T>(pending: Promise<T>) {
  let settled = false
  const result = pending.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  )
  void result.then(() => {
    settled = true
  })
  return { result, settled: () => settled }
}

export async function advanceBodyDeadline(
  reply: StalledReply,
  settled: () => boolean,
  milliseconds: number,
) {
  await reply.reading
  await vi.advanceTimersByTimeAsync(milliseconds - 1)
  expect(reply.signal.aborted).toBe(false)
  expect(settled()).toBe(false)
  await vi.advanceTimersByTimeAsync(1)
  expect(reply.signal.aborted).toBe(true)
}
