import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  PREVIEW_RELAY_PORT,
  PREVIEW_RELAY_PORT_HEADER,
  PREVIEW_RELAY_MARK_HEADER,
} from '../../src/shared/previews'
import { SESSION_COOKIE } from '../security/cookies'
import { TEST_TIME } from '../test-support/harness'
import { createPreviewHandler } from './handler'
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

it('proxies WebSocket frames without keeping an idle workspace active and closes on revocation', async () => {
  const setup = await openPreview(harness)
  expect(setup.response.status).toBe(201)
  harness.setNow(TEST_TIME + 1000)
  const response = await setup.handler.proxy(
    setup.previewRequest(`${setup.previewUrl}/socket`, {
      headers: {
        Upgrade: 'websocket',
        'Sec-WebSocket-Protocol': 'hot-reload',
        Cookie: `_port_auth=forged; shop=blue; ${SESSION_COOKIE}=app-session`,
        Origin: setup.previewUrl,
        'Sec-Fetch-Site': 'same-origin',
        [PREVIEW_RELAY_PORT_HEADER]: '9999',
      },
    }),
  )
  expect(response.status).toBe(101)
  expect(response.headers.get(PREVIEW_RELAY_MARK_HEADER)).toBe(null)
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
  expect(response.headers.get('Sec-WebSocket-Protocol')).toBe('hot-reload')
  const forwarded = harness.requests.find(
    (request) => new URL(request.url).hostname !== 'boat.dev',
  )
  expect(forwarded?.url).toBe(
    `https://sandbox-${PREVIEW_RELAY_PORT}.on.boat.dev/socket`,
  )
  expect(forwarded?.headers.get('Cookie')).toBe(
    'shop=blue; _port_auth=server-port-token',
  )
  expect(forwarded?.headers.get(PREVIEW_RELAY_PORT_HEADER)).toBe('3000')
  expect(forwarded?.headers.get('Origin')).toBe('http://localhost:3000')
  const upstream = harness.upstreamSockets[0]
  const browser = harness.serverSockets[0]
  const incoming = browser.nextMessage()
  upstream.emit(Uint8Array.of(1, 2, 3).buffer)
  expect(await incoming).toEqual(Uint8Array.of(1, 2, 3).buffer)
  harness.setNow(TEST_TIME + 2000)
  const outgoing = upstream.nextMessage()
  browser.emit('reload')
  expect(await outgoing).toBe('reload')
  await harness.activity()
  expect(await harness.status()).toEqual({ activity: TEST_TIME + 1000 })
  const another = createPreviewHandler(harness.env, harness.dependencies)
  expect(
    (
      await another.proxy(
        setup.previewRequest(`${setup.previewUrl}/socket`, {
          headers: { Upgrade: 'websocket' },
        }),
      )
    ).status,
  ).toBe(101)
  const otherBrowser = harness.serverSockets[1]
  const otherUpstream = harness.upstreamSockets[1]
  await setup.handler.revokeWorkspace(setup.workspaceId)
  expect(browser.closed?.code).toBe(1008)
  expect(upstream.closed?.code).toBe(1008)
  otherUpstream.emit('late output')
  await otherBrowser.end
  expect(otherBrowser.sent).toEqual([])
  expect(otherUpstream.closed?.code).toBe(1008)
})

it('returns a private preview error for failed upstream calls without exposing provider secrets', async () => {
  const setup = await openPreview(harness)
  expect(setup.response.status).toBe(201)
  const handler = createPreviewHandler(harness.env, harness.dependencies)
  const base = harness.dependencies.fetch
  let hostResponse = () =>
    Response.json(
      { ok: false, message: 'boat-test-key server-port-token' },
      { status: 403 },
    )
  harness.dependencies.fetch = (request) =>
    new URL(request.url).pathname.endsWith('/host')
      ? Promise.resolve(hostResponse())
      : base(request)
  const response = await handler.proxy(
    setup.previewRequest(setup.previewUrl, {
      headers: { 'Sec-Fetch-Dest': 'document' },
    }),
  )
  expect(response.status).toBe(502)
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(await response.text()).not.toContain('boat-test-key')
  harness.requests.length = 0
  hostResponse = () =>
    Response.json({
      ok: true,
      type: 'port.hosted',
      port: PREVIEW_RELAY_PORT,
      access: 'private',
      isProtected: true,
      url: 'https://attacker.test/?_token=server-port-token',
    })
  const invalid = await handler.proxy(
    setup.previewRequest(setup.previewUrl, {
      headers: { 'Sec-Fetch-Dest': 'document' },
    }),
  )
  expect(invalid.status).toBe(502)
  expect(harness.requests).toHaveLength(1)
  expect(harness.requests[0].url).toBe(
    'https://boat.dev/api/v1/sandboxes/bx_one/commands',
  )
  await harness.env.DB.prepare(
    "UPDATE workspaces SET state = 'stopped' WHERE id = ?",
  )
    .bind(setup.workspaceId)
    .run()
  harness.requests.length = 0
  expect(
    (await handler.proxy(setup.previewRequest(setup.previewUrl))).status,
  ).toBe(404)
  expect(harness.requests).toHaveLength(0)
})

it('closes a preview socket when its sandbox ID moves to another provider account', async () => {
  const setup = await openPreview(harness)
  const response = await setup.handler.proxy(
    setup.previewRequest(`${setup.previewUrl}/socket`, {
      headers: { Upgrade: 'websocket' },
    }),
  )
  expect(response.status).toBe(101)
  await harness.env.DB.prepare(
    "UPDATE workspaces SET provider_account = 'boat-second' WHERE id = ?",
  )
    .bind(setup.workspaceId)
    .run()
  const received = harness.serverSockets[0].nextMessage()
  harness.upstreamSockets[0].emit('old account output')
  expect(await received).toBe(null)
  expect(harness.serverSockets[0].sent).toEqual([])
  expect(harness.serverSockets[0].closed?.code).toBe(1008)
  expect(harness.upstreamSockets[0].closed?.code).toBe(1008)
})
