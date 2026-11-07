import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { SESSION_COOKIE } from '../security/cookies'
import { DESKTOP_SESSION_COOKIE } from '../security/desktop-contract'
import { TEST_TIME } from '../test-support/harness'
import { PREVIEW_COOKIE_PREFIX } from './credentials'
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

it('proxies HTTP with explicit headers and keeps only preview app cookies', async () => {
  const setup = await openPreview(harness)
  expect(setup.response.status).toBe(201)
  harness.requests.length = 0
  harness.setNow(TEST_TIME + 1000)
  const response = await setup.handler.proxy(
    setup.previewRequest(`${setup.previewUrl}/shop?q=1&_token=browser`, {
      method: 'POST',
      body: 'cart=2',
      headers: {
        Cookie: `_port_auth=forged; shop=blue; ${SESSION_COOKIE}=app-session; ${DESKTOP_SESSION_COOKIE}=mac-session; __Host-conductive-oauth=oauth`,
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
  const setup = await openPreview(harness)
  expect(setup.response.status).toBe(201)
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
      `${PREVIEW_COOKIE_PREFIX}another-preview=forged; Path=/; Secure; HttpOnly; Partitioned`,
    )
    headers.append(
      'Set-Cookie',
      'shop=green; Domain=.on.boat.dev; HttpOnly; Path=/',
    )
    return new Response(null, { status: 302, headers })
  }
  for (const scheme of ['https', 'http']) {
    const fetch = harness.dependencies.fetch
    harness.dependencies.fetch = async (request) => {
      const upstream = await fetch(request)
      if (upstream.headers.has('Location'))
        upstream.headers.set(
          'Location',
          `${scheme}://sandbox-3000.on.boat.dev/login?_token=server-port-token`,
        )
      return upstream
    }
    const response = await setup.handler.proxy(
      setup.previewRequest(setup.previewUrl),
    )
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(`${setup.previewUrl}/login`)
    expect(response.headers.getSetCookie()).toEqual([
      'shop=green; HttpOnly; Path=/',
    ])
    expect(response.headers.get('X-Secret')).toBe(null)
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
    harness.dependencies.fetch = fetch
  }
})

it('maps same-origin form and fetch Origins to the private port while preserving foreign and missing Origins', async () => {
  const setup = await openPreview(harness)
  const base = harness.dependencies.fetch
  const origins: (string | null)[] = []
  harness.dependencies.fetch = async (request) => {
    if (new URL(request.url).hostname === 'boat.dev') return base(request)
    origins.push(request.headers.get('Origin'))
    return new Response('accepted')
  }
  const cases: Record<string, string>[] = [
    { Origin: 'null', 'Sec-Fetch-Site': 'same-origin' },
    { Origin: setup.previewUrl, 'Sec-Fetch-Site': 'same-origin' },
    { Origin: setup.previewUrl },
    { Origin: 'https://another-preview.test', 'Sec-Fetch-Site': 'cross-site' },
    {},
  ]
  for (const headers of cases) {
    const response = await setup.handler.proxy(
      setup.previewRequest(`${setup.previewUrl}/submit`, {
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

it('forwards authenticated OPTIONS and rejects browser preflights without a credential cookie', async () => {
  const setup = await openPreview(harness)
  expect(setup.response.status).toBe(201)
  const origin =
    'https://fedcba9876543210fedcba9876543210.conductive-previews.test'
  const base = harness.dependencies.fetch
  const calls: Request[] = []
  let upstreamHeaders = new Headers()
  harness.dependencies.fetch = async (request) => {
    calls.push(request)
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
  const preflight = await setup.handler.proxy(
    new Request(`${setup.previewUrl}/api/cart`, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    }),
  )
  expect(preflight.status).toBe(404)
  expect(calls).toEqual([])
  const response = await setup.handler.proxy(
    setup.previewRequest(`${setup.previewUrl}/api/cart`, {
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
