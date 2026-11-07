import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  previewPath,
  previewsPath,
  type PreviewResponse,
} from '../../src/shared/previews'
import { TEST_TIME } from '../test-support/harness'
import { createPreviewHandler } from './handler'
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

it('persists an unpredictable preview hostname and lists it with a 24-hour expiry', async () => {
  const setup = await openPreview(harness)
  expect(setup.response.status).toBe(201)
  const { preview }: PreviewResponse = await setup.response.json()
  expect(preview).toMatchObject({
    port: 3000,
    expiresAt: TEST_TIME + 86_400_000,
  })
  expect(new URL(setup.previewUrl).hostname).toMatch(
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
  const setup = await openPreview(harness)
  expect(setup.response.status).toBe(201)
  const { preview }: PreviewResponse = await setup.response.json()
  await setup.handler.fetch(
    setup.request(previewPath(setup.orgId, setup.workspaceId, preview.id), {
      method: 'DELETE',
      body: '{}',
    }),
  )
  harness.requests.length = 0
  const closed = await setup.handler.proxy(
    setup.previewRequest(setup.previewUrl),
  )
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
  const secondBrowser = await launchPreview(
    setup.handler,
    setup.request,
    second.preview.url,
  )
  await setup.handler.revokeWorkspace(setup.workspaceId)
  harness.requests.length = 0
  expect((await setup.handler.proxy(secondBrowser.request())).status).toBe(404)
  expect(harness.requests).toHaveLength(0)
  const next = await setup.handler.fetch(
    setup.request(previewsPath(setup.orgId, setup.workspaceId), {
      method: 'POST',
      body: '{"port":3002}',
    }),
  )
  const third: PreviewResponse = await next.json()
  const thirdBrowser = await launchPreview(
    setup.handler,
    setup.request,
    third.preview.url,
  )
  expect(await setup.handler.nextExpiry(setup.workspaceId)).toBe(
    TEST_TIME + 86_400_000,
  )
  harness.setNow(TEST_TIME + 86_400_000)
  harness.requests.length = 0
  expect((await setup.handler.proxy(thirdBrowser.request())).status).toBe(404)
  expect(harness.requests).toHaveLength(0)
  await setup.handler.expire()
  harness.requests.length = 0
  expect((await setup.handler.proxy(thirdBrowser.request())).status).toBe(404)
  expect(await setup.handler.nextExpiry(setup.workspaceId)).toBe(null)
  expect(harness.requests).toHaveLength(0)
})
