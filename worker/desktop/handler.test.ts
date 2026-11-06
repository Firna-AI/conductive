import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { desktopPath } from '../../src/shared/desktop'
import { createToolsHarness, type ToolsHarness } from '../previews/test-support'
import { TEST_TIME } from '../test-support/harness'
import { createDesktopHandler } from './handler'

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

it('asks for a fresh desktop URL on every load and returns its fragment token with a 10-minute expiry', async () => {
  const seed = await harness.seed()
  const handler = createDesktopHandler(harness.env, harness.dependencies)
  const path = desktopPath(seed.orgId, seed.workspaceId)
  const first = await handler.fetch(seed.request(path))
  expect(first.status).toBe(200)
  expect(first.headers.get('Cache-Control')).toBe('no-store')
  expect(await first.json()).toEqual({
    url: 'https://sandbox-desktop.on.boat.dev/stream.html?hostId=host&appId=app#token=desktop-1',
    expiresAt: TEST_TIME + 600_000,
  })
  const second = await handler.fetch(seed.request(path))
  expect(await second.json()).toEqual({
    url: 'https://sandbox-desktop.on.boat.dev/stream.html?hostId=host&appId=app#token=desktop-2',
    expiresAt: TEST_TIME + 600_000,
  })
  expect(
    harness.requests.map((request) => [request.method, request.url]),
  ).toEqual([
    ['POST', 'https://boat.dev/api/v1/sandboxes/bx_one/desktop'],
    ['POST', 'https://boat.dev/api/v1/sandboxes/bx_one/desktop'],
  ])
  expect(harness.requests[0].headers.get('Cookie')).toBe(null)
  expect(harness.requests[0].headers.get('Authorization')).toBe(
    'Bearer boat-test-key',
  )
})

it('keeps query token desktop URLs and provisioning details out of browser responses', async () => {
  const seed = await harness.seed()
  const handler = createDesktopHandler(harness.env, harness.dependencies)
  harness.setResponse(() =>
    Response.json({
      ok: true,
      type: 'desktop.url',
      desktopUrl: 'https://sandbox-desktop.on.boat.dev/vnc.html?_token=unsafe',
    }),
  )
  const rejected = await handler.fetch(
    seed.request(desktopPath(seed.orgId, seed.workspaceId)),
  )
  expect(rejected.status).toBe(502)
  expect(await rejected.text()).not.toContain('unsafe')
  harness.setResponse(() =>
    Response.json({
      ok: true,
      type: 'desktop.provisioning',
      provisioning: true,
      message: 'provider details',
    }),
  )
  const pending = await handler.fetch(
    seed.request(desktopPath(seed.orgId, seed.workspaceId)),
  )
  expect(pending.status).toBe(409)
  expect(await pending.json()).toEqual({
    error: {
      code: 'desktop_starting',
      message: 'The desktop is starting. Try again.',
    },
  })
})

it('does not contact a sandbox when its workspace is stopped', async () => {
  const seed = await harness.seed()
  await harness.env.DB.prepare(
    "UPDATE workspaces SET state = 'stopped' WHERE id = ?",
  )
    .bind(seed.workspaceId)
    .run()
  const handler = createDesktopHandler(harness.env, harness.dependencies)
  const response = await handler.fetch(
    seed.request(desktopPath(seed.orgId, seed.workspaceId)),
  )
  expect(response.status).toBe(409)
  expect(harness.requests).toHaveLength(0)
})
