import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  previewPath,
  previewsPath,
  type PreviewResponse,
} from '../../src/shared/previews'
import { SESSION_COOKIE } from '../security/cookies'
import { TEST_TIME } from '../test-support/harness'
import { createPreviewHandler } from './handler'
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

async function open(port = 3000) {
  const seed = await harness.seed()
  const handler = createPreviewHandler(harness.env, harness.dependencies)
  const response = await handler.fetch(
    seed.request(previewsPath(seed.orgId, seed.workspaceId), {
      method: 'POST',
      body: JSON.stringify({ port }),
    }),
  )
  return { ...seed, handler, response }
}

it('persists an unpredictable preview hostname and lists it with a 24-hour expiry', async () => {
  const setup = await open()
  expect(setup.response.status).toBe(201)
  const { preview }: PreviewResponse = await setup.response.json()
  expect(preview).toMatchObject({
    port: 3000,
    expiresAt: TEST_TIME + 86_400_000,
  })
  expect(new URL(preview.url).hostname).toMatch(
    /^[a-f0-9]{32}\.conductive-previews\.test$/,
  )
  expect(preview.url).not.toContain('server-port-token')
  const another = createPreviewHandler(harness.env, harness.dependencies)
  const listed = await another.fetch(
    setup.request(previewsPath(setup.orgId, setup.workspaceId)),
  )
  expect(await listed.json()).toEqual({ previews: [preview] })
  const upstream = harness.requests.find((request) =>
    new URL(request.url).pathname.endsWith('/host'),
  )
  if (!upstream) throw new Error('Missing host call')
  expect(upstream.url).toBe('https://boat.dev/api/v1/sandboxes/bx_one/host')
  expect(await upstream.json()).toEqual({
    port: 3000,
    public: false,
    localhost: false,
  })
  expect(upstream.headers.get('Authorization')).toBe('Bearer boat-test-key')
  expect(upstream.headers.get('X-Boat-Org')).toBe('personal')
})

it('blocks unknown, closed, stopped, and expired preview hostnames before upstream access', async () => {
  const setup = await open()
  expect(setup.response.status).toBe(201)
  const { preview }: PreviewResponse = await setup.response.json()
  await setup.handler.fetch(
    setup.request(previewPath(setup.orgId, setup.workspaceId, preview.id), {
      method: 'DELETE',
      body: '{}',
    }),
  )
  harness.requests.length = 0
  const closed = await setup.handler.proxy(new Request(preview.url))
  const unknown = await setup.handler.proxy(
    new Request(
      'https://00000000000000000000000000000000.conductive-previews.test',
    ),
  )
  expect([closed.status, unknown.status]).toEqual([404, 404])
  expect(closed.headers.get('Referrer-Policy')).toBe('no-referrer')
  const opened = await setup.handler.fetch(
    setup.request(previewsPath(setup.orgId, setup.workspaceId), {
      method: 'POST',
      body: '{"port":3001}',
    }),
  )
  const second: PreviewResponse = await opened.json()
  await setup.handler.revokeWorkspace(setup.workspaceId)
  harness.requests.length = 0
  expect(
    (await setup.handler.proxy(new Request(second.preview.url))).status,
  ).toBe(404)
  expect(harness.requests).toHaveLength(0)
  const next = await setup.handler.fetch(
    setup.request(previewsPath(setup.orgId, setup.workspaceId), {
      method: 'POST',
      body: '{"port":3002}',
    }),
  )
  const third: PreviewResponse = await next.json()
  expect(await setup.handler.nextExpiry(setup.workspaceId)).toBe(
    TEST_TIME + 86_400_000,
  )
  harness.setNow(TEST_TIME + 86_400_000)
  harness.requests.length = 0
  expect(
    (await setup.handler.proxy(new Request(third.preview.url))).status,
  ).toBe(404)
  expect(harness.requests).toHaveLength(0)
  await setup.handler.expire()
  harness.requests.length = 0
  expect(
    (await setup.handler.proxy(new Request(third.preview.url))).status,
  ).toBe(404)
  expect(await setup.handler.nextExpiry(setup.workspaceId)).toBe(null)
  expect(harness.requests).toHaveLength(0)
})

it('proxies HTTP with explicit headers and keeps only preview app cookies', async () => {
  const setup = await open()
  expect(setup.response.status).toBe(201)
  const { preview }: PreviewResponse = await setup.response.json()
  harness.requests.length = 0
  harness.setNow(TEST_TIME + 1000)
  const response = await setup.handler.proxy(
    new Request(`${preview.url}/shop?q=1&_token=browser`, {
      method: 'POST',
      body: 'cart=2',
      headers: {
        Cookie: `_port_auth=forged; shop=blue; ${SESSION_COOKIE}=app-session; __Host-conductive-oauth=oauth`,
        Authorization: 'Bearer app-secret',
        'X-Private': 'secret',
        'Content-Type': 'application/x-www-form-urlencoded',
        'If-Match': 'version-1',
      },
    }),
  )
  expect(response.status).toBe(200)
  expect(await response.text()).toBe('preview content')
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
  expect(response.headers.get('Set-Cookie')).toBe('shop=green; Path=/; Secure')
  const upstream = harness.requests.find(
    (request) => new URL(request.url).hostname !== 'boat.dev',
  )
  if (!upstream) throw new Error('Missing preview request')
  expect(upstream.url).toBe('https://sandbox-3000.on.boat.dev/shop?q=1')
  expect(upstream.redirect).toBe('manual')
  expect(upstream.headers.get('Cookie')).toBe(
    'shop=blue; _port_auth=server-port-token',
  )
  expect(upstream.headers.get('Authorization')).toBe(null)
  expect(upstream.headers.get('X-Private')).toBe(null)
  expect(upstream.headers.get('If-Match')).toBe('version-1')
  expect(await upstream.text()).toBe('cart=2')
  expect(await harness.status()).toEqual({ activity: TEST_TIME + 1000 })
})

it('rewrites upstream redirects and strips reserved response cookies and headers', async () => {
  const setup = await open()
  expect(setup.response.status).toBe(201)
  const { preview }: PreviewResponse = await setup.response.json()
  harness.dependencies.fetch = async (request) => {
    if (new URL(request.url).hostname === 'boat.dev') {
      return Response.json({
        ok: true,
        type: 'port.hosted',
        port: 3000,
        access: 'private',
        isProtected: true,
        url: 'https://sandbox-3000.on.boat.dev?_token=server-port-token',
      })
    }
    const headers = new Headers({
      Location:
        'https://sandbox-3000.on.boat.dev/login?_token=server-port-token',
      'X-Secret': 'secret',
      'Referrer-Policy': 'unsafe-url',
    })
    headers.append('Set-Cookie', '_port_auth=secret; Path=/')
    headers.append('Set-Cookie', `${SESSION_COOKIE}=secret; Path=/`)
    headers.append(
      'Set-Cookie',
      'shop=green; Domain=.on.boat.dev; HttpOnly; Path=/',
    )
    return new Response(null, { status: 302, headers })
  }
  const response = await setup.handler.proxy(new Request(preview.url))
  expect(response.status).toBe(302)
  expect(response.headers.get('Location')).toBe(`${preview.url}/login`)
  expect(response.headers.getSetCookie()).toEqual([
    'shop=green; HttpOnly; Path=/',
  ])
  expect(response.headers.get('X-Secret')).toBe(null)
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
})

it('maps same-origin form and fetch Origins to the private port while preserving foreign and missing Origins', async () => {
  const setup = await open()
  const { preview }: PreviewResponse = await setup.response.json()
  const base = harness.dependencies.fetch
  const origins: (string | null)[] = []
  harness.dependencies.fetch = async (request) => {
    if (new URL(request.url).hostname === 'boat.dev') return base(request)
    origins.push(request.headers.get('Origin'))
    return new Response('accepted')
  }
  const cases: Record<string, string>[] = [
    { Origin: 'null', 'Sec-Fetch-Site': 'same-origin' },
    { Origin: preview.url, 'Sec-Fetch-Site': 'same-origin' },
    { Origin: preview.url },
    { Origin: 'https://another-preview.test', 'Sec-Fetch-Site': 'cross-site' },
    {},
  ]
  for (const headers of cases) {
    const response = await setup.handler.proxy(
      new Request(`${preview.url}/submit`, {
        method: 'POST',
        body: 'value=1',
        headers: new Headers(headers),
      }),
    )
    expect(await response.text()).toBe('accepted')
  }
  expect(origins).toEqual([
    'https://sandbox-3000.on.boat.dev',
    'https://sandbox-3000.on.boat.dev',
    'https://sandbox-3000.on.boat.dev',
    'https://another-preview.test',
    null,
  ])
})

it('preserves a preflight response from an API that reflects the requested method and headers', async () => {
  const setup = await open()
  expect(setup.response.status).toBe(201)
  const { preview }: PreviewResponse = await setup.response.json()
  const origin =
    'https://fedcba9876543210fedcba9876543210.conductive-previews.test'
  const base = harness.dependencies.fetch
  let upstreamHeaders = new Headers()
  harness.dependencies.fetch = async (request) => {
    if (new URL(request.url).hostname === 'boat.dev') return base(request)
    upstreamHeaders = request.headers
    const headers = new Headers()
    const method = request.headers.get('Access-Control-Request-Method')
    const caller = request.headers.get('Origin')
    if (request.method === 'OPTIONS' && caller && method) {
      headers.set('Access-Control-Allow-Origin', caller)
      headers.set('Access-Control-Allow-Methods', method)
      const requested = request.headers.get('Access-Control-Request-Headers')
      if (requested) headers.set('Access-Control-Allow-Headers', requested)
    }
    return new Response(null, { status: 204, headers })
  }
  const response = await setup.handler.proxy(
    new Request(`${preview.url}/api/cart`, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
        Cookie: `_port_auth=forged; ${SESSION_COOKIE}=app-session`,
        Authorization: 'Bearer app-secret',
        'X-Private': 'secret',
      },
    }),
  )
  expect(response.status).toBe(204)
  expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST')
  expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
    'content-type',
  )
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
  expect(upstreamHeaders.get('Cookie')).toBe('_port_auth=server-port-token')
  expect(upstreamHeaders.get('Authorization')).toBe(null)
  expect(upstreamHeaders.get('X-Private')).toBe(null)
})
