import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { TEST_ORIGIN } from '../test-support/harness'
import { handoffRequest, launchForm } from './launch-test-support'
import { openPreview } from './stream-test-support'
import { createToolsHarness, type ToolsHarness } from './test-support'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(async () => {
  await harness.resetTools()
})
afterAll(async () => {
  await harness.dispose()
})

async function formForPreview() {
  const setup = await openPreview(harness)
  const page = await setup.handler.fetch(
    setup.request(new URL(setup.preview.url).pathname),
  )
  expect(page.status).toBe(200)
  const form = launchForm(await page.text())
  const headers = handoffRequest(form, TEST_ORIGIN).headers
  harness.requests.length = 0
  return { handler: setup.handler, form, headers }
}

it('accepts a million-byte form and cancels an oversized handoff before later chunks', async () => {
  const { handler, form, headers } = await formForPreview()
  const encoder = new TextEncoder()
  const prefix = encoder.encode(`${form.body}&padding=`)
  const padding = new Uint8Array(1_000_000 - prefix.byteLength).fill(120)
  const accepted = await handler.proxy(
    new Request(form.action, {
      method: 'POST',
      headers,
      body: new Blob([prefix, padding]),
    }),
  )
  expect(accepted.status).toBe(303)

  const chunks = [prefix, padding, encoder.encode('x'), encoder.encode('later')]
  let pulled = 0
  let cancelled = 0
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const chunk = chunks[pulled]
        if (!chunk) {
          controller.close()
          return
        }
        pulled++
        controller.enqueue(chunk)
      },
      cancel() {
        cancelled++
      },
    },
    { highWaterMark: 0 },
  )
  const init = { method: 'POST', headers, body, duplex: 'half' }
  const request = new Request(form.action, init)
  expect(request.headers.get('Content-Length')).toBe(null)
  const refused = await handler.proxy(request)
  expect({
    status: refused.status,
    cookies: refused.headers.getSetCookie(),
    pulled,
    cancelled,
  }).toEqual({ status: 404, cookies: [], pulled: 3, cancelled: 1 })
  expect(harness.requests).toHaveLength(0)
})

it('rejects missing or failed handoff bodies as invalid without sandbox access', async () => {
  const { handler, form, headers } = await formForPreview()
  const failed = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        controller.error(new Error('The form body failed.'))
      },
    },
    { highWaterMark: 0 },
  )
  for (const body of [undefined, failed]) {
    const init = { method: 'POST', headers, body, duplex: 'half' }
    const response = await handler.proxy(new Request(form.action, init))
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: {
        code: 'preview_not_found',
        message: 'The preview is not available.',
      },
    })
    expect(response.headers.getSetCookie()).toEqual([])
  }
  expect(harness.requests).toHaveLength(0)
})
