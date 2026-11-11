import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { PREVIEW_RELAY_MARK_HEADER } from '../../src/shared/previews'
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

const providerUnavailable = {
  error: {
    code: 'sandbox_unavailable',
    message: 'The cloud computer did not answer. Try again.',
  },
}

it.each(['HTTP', 'WebSocket'])(
  'replaces an unmarked %s gateway answer and checks the relay on the next request',
  async (kind) => {
    const setup = await openPreview(harness)
    const base = harness.dependencies.fetch
    let forwarded = 0
    harness.dependencies.fetch = async (request) => {
      if (new URL(request.url).hostname === 'boat.dev') return base(request)
      forwarded++
      return new Response('Private provider gateway page.', { status: 502 })
    }
    harness.setRelaySocketActive(false)
    harness.requests.length = 0
    const response = await setup.handler.proxy(
      setup.previewRequest(setup.previewUrl, {
        headers: kind === 'WebSocket' ? { Upgrade: 'websocket' } : {},
      }),
    )
    expect(response.status).toBe(502)
    expect(await response.text()).toBe(JSON.stringify(providerUnavailable))
    expect(response.headers.get(PREVIEW_RELAY_MARK_HEADER)).toBe(null)
    expect(harness.requests).toHaveLength(0)
    const next = await setup.handler.proxy(setup.previewRequest())
    expect(next.status).toBe(409)
    expect(await next.json()).toEqual({
      error: {
        code: 'preview_relay_unavailable',
        message:
          'Previews need an update to the agent and terminal software. The next workspace start will update it.',
      },
    })
    expect(forwarded).toBe(1)
    expect(harness.requests.map((request) => request.url)).toEqual([
      'https://boat.dev/api/v1/sandboxes/bx_one/commands',
    ])
  },
)

it('rejects an unmarked successful WebSocket handshake before bridging it', async () => {
  const setup = await openPreview(harness)
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) => {
    const response = await base(request)
    if (new URL(request.url).hostname !== 'boat.dev')
      response.headers.delete(PREVIEW_RELAY_MARK_HEADER)
    return response
  }
  const response = await setup.handler.proxy(
    setup.previewRequest(setup.previewUrl, {
      headers: { Upgrade: 'websocket' },
    }),
  )
  expect(response.status).toBe(502)
  expect(await response.json()).toEqual(providerUnavailable)
  expect(harness.serverSockets).toHaveLength(0)
  expect(harness.upstreamSockets[0].closed?.code).toBe(1008)
  harness.setRelaySocketActive(false)
  harness.requests.length = 0
  const next = await setup.handler.proxy(setup.previewRequest())
  expect(next.status).toBe(409)
  expect(harness.requests.map((request) => request.url)).toEqual([
    'https://boat.dev/api/v1/sandboxes/bx_one/commands',
  ])
})

it.each([502, 401, 403])(
  'keeps a marked %s response and its descriptor without exposing the mark',
  async (status) => {
    const setup = await openPreview(harness)
    const base = harness.dependencies.fetch
    let forwarded = 0
    harness.dependencies.fetch = async (request) => {
      if (new URL(request.url).hostname === 'boat.dev') return base(request)
      forwarded++
      return new Response('The server did not answer.', {
        status,
        headers: { [PREVIEW_RELAY_MARK_HEADER]: '1' },
      })
    }
    harness.requests.length = 0
    for (const destination of ['document', 'iframe']) {
      const response = await setup.handler.proxy(
        setup.previewRequest(setup.previewUrl, {
          headers: { 'Sec-Fetch-Dest': destination },
        }),
      )
      expect(response.status).toBe(status)
      expect(await response.text()).toBe('The server did not answer.')
      expect(response.headers.get(PREVIEW_RELAY_MARK_HEADER)).toBe(null)
    }
    expect(forwarded).toBe(2)
    expect(harness.requests).toHaveLength(0)
  },
)
