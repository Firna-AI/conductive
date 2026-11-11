import type { ToolsHarness } from './test-support'
import { createPreviewHandler } from './handler'
import { launchPreview } from './launch-test-support'
import { previewsPath, type PreviewResponse } from '../../src/shared/previews'

export function barrier<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error('Barrier not ready')
  }
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

/** A byte stream, like a fetch body, that sends text only when a test asks. */
export function bodySource() {
  let controller: ReadableByteStreamController | null = null
  let cancelled = false
  let pulls = 0
  let onPull: (() => void) | null = null
  const stream = new ReadableStream(
    {
      type: 'bytes',
      start(value) {
        controller = value
      },
      cancel() {
        cancelled = true
      },
      pull() {
        pulls++
        onPull?.()
        onPull = null
      },
    },
    { highWaterMark: 0 },
  )
  return {
    stream,
    send: (text: string) => controller?.enqueue(new TextEncoder().encode(text)),
    get cancelled() {
      return cancelled
    },
    get pulls() {
      return pulls
    },
    nextPull: () =>
      new Promise<void>((resolve) => {
        onPull = resolve
      }),
  }
}

/** Counts preview access reads. The first read waits until the test releases it. */
export function holdFirstAccessRead(harness: ToolsHarness) {
  const started = barrier<void>()
  const release = barrier<void>()
  let reads = 0
  const database = harness.env.DB
  const prepare = database.prepare.bind(database)
  const wrap = (statement: D1PreparedStatement): D1PreparedStatement =>
    new Proxy(statement, {
      get(target, name) {
        if (name === 'bind')
          return (...values: unknown[]) => wrap(target.bind(...values))
        if (name !== 'all') return Reflect.get(target, name)
        return async () => {
          const result = await target.all()
          reads++
          if (reads === 1) {
            started.resolve()
            await release.promise
          }
          return result
        }
      },
    })
  harness.env.DB = new Proxy(database, {
    get(target, name) {
      return name === 'prepare'
        ? (query: string) =>
            query.includes('WITH requested')
              ? wrap(prepare(query))
              : prepare(query)
        : Reflect.get(target, name)
    },
  })
  return {
    started: started.promise,
    release: () => release.resolve(),
    get reads() {
      return reads
    },
    restore: () => {
      harness.env.DB = database
    },
  }
}

export async function openPreview(harness: ToolsHarness, port = 3000) {
  const seed = await harness.seed()
  const handler = createPreviewHandler(harness.env, harness.dependencies)
  const response = await handler.fetch(
    seed.request(previewsPath(seed.orgId, seed.workspaceId), {
      method: 'POST',
      body: JSON.stringify({ port }),
    }),
  )
  const { preview }: PreviewResponse = await response.clone().json()
  const browser = await launchPreview(handler, seed.request, preview.url)
  return {
    ...seed,
    handler,
    response,
    preview,
    previewUrl: browser.previewUrl,
    previewRequest: browser.request,
  }
}
