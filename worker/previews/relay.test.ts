import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  PREVIEW_RELAY_PORT,
  PREVIEW_RELAY_PORT_HEADER,
  previewsPath,
  type PreviewResponse,
} from '../../src/shared/previews'
import { createPreviewHandler } from './handler'
import { relayResponse } from './relay.test-support'
import { launchPreview } from './launch-test-support'
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

const unavailable = {
  error: {
    code: 'preview_relay_unavailable',
    message:
      'Previews need newer cloud computer software. Start a new workspace after an admin runs Build computer.',
  },
}

it('refuses an open when the relay socket is inactive without hosting a port', async () => {
  const seed = await harness.seed()
  harness.setRelaySocketActive(false)
  const handler = createPreviewHandler(harness.env, harness.dependencies)
  const response = await handler.fetch(
    seed.request(previewsPath(seed.orgId, seed.workspaceId), {
      method: 'POST',
      body: '{"port":3000}',
    }),
  )
  expect(response.status).toBe(409)
  expect(await response.json()).toEqual(unavailable)
  expect(harness.requests.map((request) => request.url)).toEqual([
    'https://boat.dev/api/v1/sandboxes/bx_one/commands',
  ])
  const listed = await handler.fetch(
    seed.request(previewsPath(seed.orgId, seed.workspaceId)),
  )
  expect(await listed.json()).toEqual({ previews: [] })
  harness.setRelaySocketActive(true)
  const opened = await handler.fetch(
    seed.request(previewsPath(seed.orgId, seed.workspaceId), {
      method: 'POST',
      body: '{"port":3000}',
    }),
  )
  expect(opened.status).toBe(201)
  harness.setRelaySocketActive(false)
  harness.requests.length = 0
  const stopped = await handler.fetch(
    seed.request(previewsPath(seed.orgId, seed.workspaceId), {
      method: 'POST',
      body: '{"port":3001}',
    }),
  )
  expect(stopped.status).toBe(409)
  expect(await stopped.json()).toEqual(unavailable)
  expect(harness.requests.map((request) => request.url)).toEqual([
    'https://boat.dev/api/v1/sandboxes/bx_one/commands',
  ])
})

it('refuses a proxy cache miss when the relay socket is inactive without forwarding the request', async () => {
  const setup = await openPreview(harness)
  harness.setRelaySocketActive(false)
  harness.requests.length = 0
  const handler = createPreviewHandler(harness.env, harness.dependencies)
  const response = await handler.proxy(setup.previewRequest(setup.previewUrl))
  expect(response.status).toBe(409)
  expect(await response.json()).toEqual(unavailable)
  expect(harness.requests.map((request) => request.url)).toEqual([
    'https://boat.dev/api/v1/sandboxes/bx_one/commands',
  ])
})

it.each([401, 'network failure'] as const)(
  'drops the relay descriptor after %s so the next request checks the socket',
  async (failure) => {
    const setup = await openPreview(harness)
    const base = harness.dependencies.fetch
    harness.dependencies.fetch = async (request) => {
      if (new URL(request.url).hostname === 'boat.dev') return base(request)
      if (failure === 'network failure') throw new Error('connection lost')
      return new Response('refused', { status: failure })
    }
    const failed = await setup.handler.proxy(
      setup.previewRequest(setup.previewUrl),
    )
    expect(failed.status).toBe(502)
    harness.setRelaySocketActive(false)
    harness.requests.length = 0
    const next = await setup.handler.proxy(
      setup.previewRequest(`${setup.previewUrl}/module.js`),
    )
    expect(next.status).toBe(409)
    expect(await next.json()).toEqual(unavailable)
    expect(harness.requests.map((request) => request.url)).toEqual([
      'https://boat.dev/api/v1/sandboxes/bx_one/commands',
    ])
  },
)

it('shares one relay descriptor across concurrent previews of different ports', async () => {
  const setup = await openPreview(harness)
  const opened = await setup.handler.fetch(
    setup.request(previewsPath(setup.orgId, setup.workspaceId), {
      method: 'POST',
      body: '{"port":3001}',
    }),
  )
  const { preview }: PreviewResponse = await opened.json()
  const second = await launchPreview(setup.handler, setup.request, preview.url)
  const handler = createPreviewHandler(harness.env, harness.dependencies)
  harness.requests.length = 0
  const responses = await Promise.all([
    handler.proxy(setup.previewRequest(`${setup.previewUrl}/first.js`)),
    handler.proxy(second.request(`${second.previewUrl}/second.js`)),
  ])
  expect(
    await Promise.all(responses.map((response) => response.text())),
  ).toEqual(['preview content', 'preview content'])
  const forwarded = harness.requests.filter(
    (request) => new URL(request.url).hostname !== 'boat.dev',
  )
  expect(forwarded.map((request) => request.url).toSorted()).toEqual([
    `https://sandbox-${PREVIEW_RELAY_PORT}.on.boat.dev/first.js`,
    `https://sandbox-${PREVIEW_RELAY_PORT}.on.boat.dev/second.js`,
  ])
  expect(
    forwarded
      .map((request) => request.headers.get(PREVIEW_RELAY_PORT_HEADER))
      .toSorted(),
  ).toEqual(['3000', '3001'])
  for (const route of ['/commands', '/host'])
    expect(
      harness.requests.filter((request) =>
        new URL(request.url).pathname.endsWith(route),
      ),
    ).toHaveLength(1)
})

it('keeps redirects to the hosted address instead of mapping them to the preview hostname', async () => {
  const setup = await openPreview(harness)
  await (await setup.handler.proxy(setup.previewRequest())).text()
  const forwarded = harness.requests.find(
    (request) => new URL(request.url).hostname !== 'boat.dev',
  )
  if (!forwarded) throw new Error('Missing upstream request')
  const location = `${new URL(forwarded.url).origin}/login`
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) =>
    new URL(request.url).hostname === 'boat.dev'
      ? base(request)
      : relayResponse(null, { status: 302, headers: { Location: location } })
  const response = await setup.handler.proxy(setup.previewRequest())
  expect(response.status).toBe(302)
  expect(response.headers.get('Location')).toBe(location)
})
