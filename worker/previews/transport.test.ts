import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { previewsPath, type PreviewResponse } from '../../src/shared/previews'
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

it('proxies WebSocket frames without keeping an idle workspace active and closes on revocation', async () => {
  const setup = await open()
  expect(setup.response.status).toBe(201)
  const { preview }: PreviewResponse = await setup.response.json()
  harness.setNow(TEST_TIME + 1000)
  const response = await setup.handler.proxy(
    new Request(`${preview.url}/socket`, {
      headers: {
        Upgrade: 'websocket',
        'Sec-WebSocket-Protocol': 'hot-reload',
        Cookie: `_port_auth=forged; shop=blue; ${SESSION_COOKIE}=app-session`,
      },
    }),
  )
  expect(response.status).toBe(101)
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
  expect(response.headers.get('Sec-WebSocket-Protocol')).toBe('hot-reload')
  expect(
    harness.requests
      .find((request) => new URL(request.url).hostname !== 'boat.dev')
      ?.headers.get('Cookie'),
  ).toBe('shop=blue; _port_auth=server-port-token')
  const upstream = harness.upstreamSockets[0]
  const browser = harness.serverSockets[0]
  const incoming = browser.nextMessage()
  upstream.emit(Uint8Array.of(1, 2, 3).buffer)
  expect(await incoming).toEqual(Uint8Array.of(1, 2, 3).buffer)
  harness.setNow(TEST_TIME + 2000)
  const outgoing = upstream.nextMessage()
  browser.emit('reload')
  expect(await outgoing).toBe('reload')
  expect(await harness.status()).toEqual({ activity: TEST_TIME + 1000 })
  const another = createPreviewHandler(harness.env, harness.dependencies)
  expect(
    (
      await another.proxy(
        new Request(`${preview.url}/socket`, {
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
  const setup = await open()
  expect(setup.response.status).toBe(201)
  const { preview }: PreviewResponse = await setup.response.json()
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
  const response = await setup.handler.proxy(
    new Request(preview.url, { headers: { 'Sec-Fetch-Dest': 'document' } }),
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
      port: 3000,
      access: 'private',
      isProtected: true,
      url: 'https://attacker.test/?_token=server-port-token',
    })
  const invalid = await setup.handler.proxy(
    new Request(preview.url, { headers: { 'Sec-Fetch-Dest': 'document' } }),
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
  expect((await setup.handler.proxy(new Request(preview.url))).status).toBe(404)
  expect(harness.requests).toHaveLength(0)
})
