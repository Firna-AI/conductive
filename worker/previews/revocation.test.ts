import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  previewPath,
  previewsPath,
  type PreviewResponse,
} from '../../src/shared/previews'
import { TEST_TIME } from '../test-support/harness'
import { createPreviewHandler } from './handler'
import { barrier, bodySource, openPreview } from './stream-test-support'
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

it('keeps a foreign preview open when another authorized workspace closes its ID', async () => {
  const setup = await openPreview(harness)
  await setup.handler.proxy(
    new Request(setup.preview.url, { headers: { Upgrade: 'websocket' } }),
  )
  const victim = harness.serverSockets[0]
  harness.github.profile = {
    id: 9,
    login: 'attacker',
    name: 'Other user',
    avatar_url: null,
  }
  const session = await harness.login()
  const org = await harness.createOrg(session)
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch)
      VALUES ('other-repo', ?, 101, 'other/repo', 'main')`,
    ).bind(org.id),
    harness.env.DB.prepare(
      `INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, name, branch,
      sandbox_id, state, created_at, updated_at)
      SELECT 'other-workspace', ?, 'other-repo', creator_user_id, 'Other', 'other/task',
      'bx_other', 'ready', ?, ? FROM orgs WHERE id = ?`,
    ).bind(org.id, TEST_TIME, TEST_TIME, org.id),
  ])
  const attack = new Request(
    `https://app.conducting.test${previewPath(org.id, 'other-workspace', setup.preview.id)}`,
    {
      method: 'DELETE',
      body: '{}',
      headers: {
        Cookie: session,
        Origin: 'https://app.conducting.test',
        'Content-Type': 'application/json',
      },
    },
  )
  expect((await setup.handler.fetch(attack)).status).toBe(204)
  expect(victim.closed).toBe(null)
  const own = setup.request(
    previewPath(setup.orgId, setup.workspaceId, setup.preview.id),
    { method: 'DELETE', body: '{}' },
  )
  expect((await setup.handler.fetch(own)).status).toBe(204)
  expect(victim.closed?.code).toBe(1008)
})

it('cancels local HTTP streams on preview close, workspace revocation, and expiry', async () => {
  const setup = await openPreview(harness)
  const base = harness.dependencies.fetch
  let source = bodySource()
  harness.dependencies.fetch = async (request) =>
    new URL(request.url).hostname === 'boat.dev'
      ? base(request)
      : new Response(source.stream)
  for (const action of ['close', 'workspace', 'expiry']) {
    const opened = await setup.handler.fetch(
      setup.request(previewsPath(setup.orgId, setup.workspaceId), {
        method: 'POST',
        body: '{"port":3000}',
      }),
    )
    const { preview }: PreviewResponse = await opened.json()
    source = bodySource()
    const response = await setup.handler.proxy(new Request(preview.url))
    const reader = response.body?.getReader()
    const before = reader?.read()
    source.send('before')
    expect(new TextDecoder().decode((await before)?.value)).toBe('before')
    if (action === 'close')
      await setup.handler.fetch(
        setup.request(previewPath(setup.orgId, setup.workspaceId, preview.id), {
          method: 'DELETE',
          body: '{}',
        }),
      )
    if (action === 'workspace')
      await setup.handler.revokeWorkspace(setup.workspaceId)
    if (action === 'expiry') {
      harness.setNow(TEST_TIME + 86_400_000)
      await setup.handler.expire()
    }
    expect(source.cancelled, action).toBe(true)
    await expect(reader?.read()).rejects.toMatchObject({ name: 'AbortError' })
  }
})

it('blocks HTTP response data revoked by another handler after the stream opened', async () => {
  const setup = await openPreview(harness)
  const source = bodySource()
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) =>
    new URL(request.url).hostname === 'boat.dev'
      ? base(request)
      : new Response(source.stream)
  const response = await setup.handler.proxy(new Request(setup.preview.url))
  const reader = response.body?.getReader()
  const before = reader?.read()
  source.send('before')
  expect(new TextDecoder().decode((await before)?.value)).toBe('before')
  const other = createPreviewHandler(harness.env, harness.dependencies)
  await other.revokeWorkspace(setup.workspaceId)
  const after = reader?.read()
  source.send('sensitive-after-close')
  await expect(after).rejects.toMatchObject({ name: 'AbortError' })
  expect(source.cancelled).toBe(true)
})

it('rejects streamed uploads after workspace revocation or stop', async () => {
  const setup = await openPreview(harness)
  for (const action of ['revoke', 'stop']) {
    const opened = await setup.handler.fetch(
      setup.request(previewsPath(setup.orgId, setup.workspaceId), {
        method: 'POST',
        body: '{"port":3000}',
      }),
    )
    const { preview }: PreviewResponse = await opened.json()
    const source = bodySource()
    const attached = barrier<ReadableStreamDefaultReader<Uint8Array>>()
    const base = harness.dependencies.fetch
    harness.dependencies.fetch = async (request) => {
      if (new URL(request.url).hostname === 'boat.dev') return base(request)
      const reader = request.body?.getReader()
      if (!reader) throw new Error('Missing request body')
      attached.resolve(reader)
      return new Response('ok')
    }
    const init = { method: 'POST', body: source.stream, duplex: 'half' }
    const pending = setup.handler.proxy(new Request(preview.url, init))
    const reader = await attached.promise
    const before = reader.read()
    source.send('before')
    expect(new TextDecoder().decode((await before).value)).toBe('before')
    await pending
    const other = createPreviewHandler(harness.env, harness.dependencies)
    if (action === 'revoke') await other.revokeWorkspace(setup.workspaceId)
    else
      await harness.env.DB.prepare(
        "UPDATE workspaces SET state = 'stopped' WHERE id = ?",
      )
        .bind(setup.workspaceId)
        .run()
    const after = reader.read()
    source.send('sensitive-after-close')
    await expect(after).rejects.toMatchObject({ name: 'AbortError' })
    expect(source.cancelled).toBe(true)
  }
})
