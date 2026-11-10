import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  previewPath,
  previewsPath,
  type PreviewResponse,
} from '../../src/shared/previews'
import { barrier, openPreview } from './stream-test-support'
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

async function records(workspaceId: string) {
  const { results } = await harness.env.DB.prepare(
    `SELECT port, listener_sandbox_id AS sandboxId, listener_mode AS mode
     FROM preview_hostnames WHERE workspace_id = ? ORDER BY port`,
  )
    .bind(workspaceId)
    .all<{ port: number; sandboxId: string | null; mode: string | null }>()
  return results
}

it('records the sandbox at open and updates every active preview after a sandbox change', async () => {
  const setup = await openPreview(harness)
  expect(await records(setup.workspaceId)).toEqual([
    { port: 3000, sandboxId: 'bx_one', mode: null },
  ])
  const added: PreviewResponse[] = []
  for (const port of [3001, 3002]) {
    const opened = await setup.handler.fetch(
      setup.request(previewsPath(setup.orgId, setup.workspaceId), {
        method: 'POST',
        body: JSON.stringify({ port }),
      }),
    )
    expect(opened.status).toBe(201)
    added.push(await opened.json())
  }
  const closed = await setup.handler.fetch(
    setup.request(
      previewPath(setup.orgId, setup.workspaceId, added[1].preview.id),
      { method: 'DELETE', body: '{}' },
    ),
  )
  expect(closed.status).toBe(204)
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      'UPDATE workspaces SET sandbox_id = ? WHERE id = ?',
    ).bind('bx_new', setup.workspaceId),
    harness.env.DB.prepare(
      'UPDATE preview_hostnames SET listener_mode = ? WHERE id = ?',
    ).bind('network', setup.preview.id),
  ])
  const response = await setup.handler.proxy(setup.previewRequest())
  expect(await response.text()).toBe('preview content')
  expect(await records(setup.workspaceId)).toEqual([
    { port: 3000, sandboxId: 'bx_new', mode: 'network' },
    { port: 3001, sandboxId: 'bx_new', mode: null },
    { port: 3002, sandboxId: 'bx_one', mode: null },
  ])
})

it('keeps the newer sandbox record when an old relay resolution finishes later', async () => {
  const setup = await openPreview(harness)
  const started = barrier<void>()
  const release = barrier<void>()
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) => {
    const response = await base(request)
    if (new URL(request.url).pathname === '/api/v1/sandboxes/bx_old/host') {
      started.resolve()
      await release.promise
    }
    return response
  }
  await harness.env.DB.prepare(
    'UPDATE workspaces SET sandbox_id = ? WHERE id = ?',
  )
    .bind('bx_old', setup.workspaceId)
    .run()
  const pending = setup.handler.proxy(setup.previewRequest())
  await started.promise
  try {
    await harness.env.DB.prepare(
      'UPDATE workspaces SET sandbox_id = ? WHERE id = ?',
    )
      .bind('bx_new', setup.workspaceId)
      .run()
    const newer = await setup.handler.proxy(setup.previewRequest())
    expect(await newer.text()).toBe('preview content')
    expect(await records(setup.workspaceId)).toEqual([
      { port: 3000, sandboxId: 'bx_new', mode: null },
    ])
  } finally {
    release.resolve()
    await pending
  }
  expect((await pending).status).toBe(404)
  expect(await records(setup.workspaceId)).toEqual([
    { port: 3000, sandboxId: 'bx_new', mode: null },
  ])
})
