import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

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

it('blocks the old sandbox port when ownership changes during the provider host call', async () => {
  const setup = await openPreview(harness)
  const handler = createPreviewHandler(harness.env, harness.dependencies)
  harness.requests.length = 0
  const fetch = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) => {
    const response = await fetch(request)
    if (new URL(request.url).pathname.endsWith('/host')) {
      await harness.env.DB.prepare(
        "UPDATE workspaces SET sandbox_id = 'bx_two' WHERE id = ?",
      )
        .bind(setup.workspaceId)
        .run()
    }
    return response
  }
  const response = await handler.proxy(
    setup.previewRequest(setup.previewUrl, {
      headers: { 'Sec-Fetch-Dest': 'document' },
    }),
  )
  expect(response.status).toBe(404)
  expect(harness.requests.map((request) => request.url)).toEqual([
    'https://boat.dev/api/v1/sandboxes/bx_one/commands',
    'https://boat.dev/api/v1/sandboxes/bx_one/host',
  ])
})

it('resolves a relative redirect against the requested upstream path', async () => {
  const setup = await openPreview(harness)
  const fetch = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) => {
    if (new URL(request.url).hostname === 'boat.dev') return fetch(request)
    return new Response(null, {
      status: 302,
      headers: { Location: 'login' },
    })
  }
  const response = await setup.handler.proxy(
    setup.previewRequest(`${setup.previewUrl}/account/start?old=1`),
  )
  expect(response.status).toBe(302)
  expect(response.headers.get('Location')).toBe(
    `${setup.previewUrl}/account/login`,
  )
})
