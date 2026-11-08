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

export function bodySource() {
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null
  let cancelled = false
  let pulls = 0
  let onPull: (() => void) | null = null
  const stream = new ReadableStream<Uint8Array>(
    {
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
