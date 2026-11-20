import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  filesPreviewPath,
  previewPath,
  previewsPath,
  type PreviewResponse,
} from '../../src/shared/previews'
import { TEST_TIME } from '../test-support/harness'
import { createPreviewHandler } from './handler'
import { filesPreviewSetup } from './files-test-support'
import { createToolsHarness, type ToolsHarness } from './test-support'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(() => harness.resetTools())
afterAll(() => harness.dispose())

it('opens one files preview and reuses its launch address and expiry', async () => {
  const setup = await filesPreviewSetup(harness)
  const response = await setup.open()
  expect(response.status).toBe(201)
  const { preview }: PreviewResponse = await response.json()
  expect(preview).toEqual({
    id: expect.any(String),
    port: 0,
    url: `${harness.env.APP_ORIGIN}${previewPath(setup.orgId, setup.workspaceId, preview.id)}`,
    expiresAt: TEST_TIME + 86_400_000,
  })
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  harness.setNow(TEST_TIME + 1000)
  const reused = await setup.open()
  expect(reused.status).toBe(200)
  expect(await reused.json()).toEqual({ preview })
  expect(await setup.handler.nextExpiry(setup.workspaceId)).toBe(
    preview.expiresAt,
  )
})

it('makes simultaneous files opens through separate handlers share one active row', async () => {
  const setup = await filesPreviewSetup(harness)
  const other = createPreviewHandler(harness.env, setup.dependencies)
  const responses = await Promise.all([setup.open(), setup.open(other)])
  expect(responses.map((response) => response.status).sort()).toEqual([
    200, 201,
  ])
  const [first, second] = await Promise.all(
    responses.map(async (response): Promise<PreviewResponse> =>
      response.json(),
    ),
  )
  expect(first).toEqual(second)
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM preview_hostnames WHERE workspace_id = ? AND port = 0 AND revoked_at IS NULL',
    )
      .bind(setup.workspaceId)
      .first('count'),
  ).toBe(1)
})

it.each(['expired', 'revoked'] as const)(
  'opens a new files preview when the previous one is %s',
  async (end) => {
    const setup = await filesPreviewSetup(harness)
    const response = await setup.open()
    expect(response.status).toBe(201)
    const first: PreviewResponse = await response.json()
    if (end === 'expired') harness.setNow(TEST_TIME + 86_400_000)
    else await setup.handler.revokeWorkspace(setup.workspaceId)
    const next = await setup.open()
    expect(next.status).toBe(201)
    const second: PreviewResponse = await next.json()
    expect(second.preview.id).not.toBe(first.preview.id)
    expect(second.preview.port).toBe(0)
  },
)

it.each(['no runner', 'older runner'])(
  'refuses files opens with %s before checking the relay',
  async (runner) => {
    const seed = await harness.seed()
    const handler = createPreviewHandler(harness.env, {
      ...harness.dependencies,
      ...(runner === 'older runner'
        ? { fileServerAvailable: () => false }
        : {}),
    })
    harness.setRelaySocketActive(false)
    const response = await handler.fetch(
      seed.request(filesPreviewPath(seed.orgId, seed.workspaceId), {
        method: 'POST',
        body: '{}',
      }),
    )
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: {
        code: 'file_server_unavailable',
        message:
          'The preview needs newer cloud computer software. Select Restart in the workspace header.',
      },
    })
    expect(harness.requests).toEqual([])
  },
)

it('refuses files opens for a stopped computer before checking software or the relay', async () => {
  const setup = await filesPreviewSetup(harness)
  await harness.env.DB.prepare(
    "UPDATE workspaces SET state = 'stopped' WHERE id = ?",
  )
    .bind(setup.workspaceId)
    .run()
  const response = await setup.open()
  expect(response.status).toBe(409)
  expect(await response.json()).toMatchObject({
    error: { code: 'sandbox_not_ready' },
  })
  expect(harness.requests).toEqual([])
})

it('checks the relay for both a new and an existing files preview', async () => {
  const setup = await filesPreviewSetup(harness)
  for (const existing of [false, true]) {
    harness.setRelaySocketActive(false)
    harness.requests.length = 0
    const response = await setup.open()
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: { code: 'preview_relay_unavailable' },
    })
    expect(
      harness.requests.map((request) => new URL(request.url).pathname),
    ).toEqual(['/api/v1/sandboxes/bx_one/commands'])
    if (!existing) {
      harness.setRelaySocketActive(true)
      expect((await setup.open()).status).toBe(201)
    }
  }
})

it('leaves files previews out of the app list and ignores their app close', async () => {
  const setup = await filesPreviewSetup(harness)
  const response = await setup.open()
  expect(response.status).toBe(201)
  const { preview }: PreviewResponse = await response.json()
  const opened = await setup.handler.fetch(
    setup.request(previewsPath(setup.orgId, setup.workspaceId), {
      method: 'POST',
      body: '{"port":3000}',
    }),
  )
  const portPreview: PreviewResponse = await opened.json()
  const closed = await setup.handler.fetch(
    setup.request(new URL(preview.url).pathname, {
      method: 'DELETE',
      body: '{}',
    }),
  )
  expect(closed.status).toBe(204)
  const list = await setup.handler.fetch(
    setup.request(previewsPath(setup.orgId, setup.workspaceId)),
  )
  expect(await list.json()).toEqual({ previews: [portPreview.preview] })
  const again = await setup.open()
  expect(again.status).toBe(200)
  expect(await again.json()).toEqual({ preview })
})
