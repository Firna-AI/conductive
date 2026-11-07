import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { userSuspensionPath } from '../../src/shared/operator'
import { previewsPath } from '../../src/shared/previews'
import { TEST_ORIGIN } from '../test-support/harness'
import { createPreviewHandler } from './handler'
import { handoffRequest, launchForm } from './launch-test-support'
import { barrier, bodySource, openPreview } from './stream-test-support'
import { activeMember, suspendWorkspaceOwner } from './suspension-test-support'
import { createToolsHarness, type ToolsHarness } from './test-support'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(async () => {
  await harness.resetTools()
  delete harness.env.OPERATOR_GITHUB_IDS
})
afterAll(async () => {
  await harness.dispose()
})

it('keeps previews closed to an active member while the suspended owner stop is pending', async () => {
  const setup = await openPreview(harness)
  const member = await activeMember(harness, setup.orgId)
  harness.env.OPERATOR_GITHUB_IDS = String(member.user.githubId)
  const suspended = await harness.request(
    userSuspensionPath(7),
    member.session,
    {
      method: 'POST',
      body: '{}',
    },
  )
  expect(suspended.status).toBe(202)
  expect(await suspended.json()).toMatchObject({
    pendingWorkspaceIds: [setup.workspaceId],
  })
  expect(
    await harness.env.DB.prepare('SELECT state FROM workspaces WHERE id = ?')
      .bind(setup.workspaceId)
      .first('state'),
  ).toBe('ready')
  harness.requests.length = 0
  const another = createPreviewHandler(harness.env, harness.dependencies)
  const reopened = await another.fetch(
    member.request(previewsPath(setup.orgId, setup.workspaceId), {
      method: 'POST',
      body: '{"port":3000}',
    }),
  )
  expect(reopened.status).toBe(403)
  expect(
    (await another.fetch(member.request(new URL(setup.preview.url).pathname)))
      .status,
  ).toBe(403)
  expect((await another.proxy(setup.previewRequest())).status).toBe(404)
  expect(harness.requests).toHaveLength(0)
  const listed = await another.fetch(
    member.request(previewsPath(setup.orgId, setup.workspaceId)),
  )
  expect(listed.status).toBe(200)
  expect(await listed.json()).toEqual({ previews: [] })
  expect(
    (
      await another.fetch(
        member.request(new URL(setup.preview.url).pathname, {
          method: 'DELETE',
          body: '{}',
        }),
      )
    ).status,
  ).toBe(204)
})

it('checks owner suspension before issuing grants or forwarding preview data from an unrevoked row', async () => {
  const setup = await openPreview(harness)
  const member = await activeMember(harness, setup.orgId)
  const launch = await setup.handler.fetch(
    member.request(new URL(setup.preview.url).pathname),
  )
  expect(launch.status).toBe(200)
  const unused = launchForm(await launch.text())
  const source = bodySource()
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) =>
    new URL(request.url).hostname === 'boat.dev'
      ? base(request)
      : new Response(source.stream)
  const response = await setup.handler.proxy(setup.previewRequest())
  const reader = response.body?.getReader()
  const before = reader?.read()
  source.send('before suspension')
  expect(new TextDecoder().decode((await before)?.value)).toBe(
    'before suspension',
  )
  await suspendWorkspaceOwner(harness, setup.workspaceId)
  expect(
    await harness.env.DB.prepare(
      'SELECT revoked_at FROM preview_hostnames WHERE id = ?',
    )
      .bind(setup.preview.id)
      .first('revoked_at'),
  ).toBeNull()
  harness.requests.length = 0
  expect(
    (
      await setup.handler.fetch(
        member.request(new URL(setup.preview.url).pathname),
      )
    ).status,
  ).toBe(403)
  expect(
    (await setup.handler.proxy(handoffRequest(unused, TEST_ORIGIN))).status,
  ).toBe(404)
  expect((await setup.handler.proxy(setup.previewRequest())).status).toBe(404)
  const after = reader?.read()
  source.send('after suspension')
  await expect(after).rejects.toMatchObject({ name: 'AbortError' })
  expect(source.cancelled).toBe(true)
  expect(harness.requests).toHaveLength(0)
})

it('rejects preview creation when the owner is suspended during port resolution', async () => {
  const setup = await harness.seed()
  const member = await activeMember(harness, setup.orgId)
  const entered = barrier<void>()
  const release = barrier<void>()
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) => {
    const response = await base(request)
    if (new URL(request.url).pathname.endsWith('/host')) {
      entered.resolve()
      await release.promise
    }
    return response
  }
  const handler = createPreviewHandler(harness.env, harness.dependencies)
  const creating = handler.fetch(
    member.request(previewsPath(setup.orgId, setup.workspaceId), {
      method: 'POST',
      body: '{"port":3000}',
    }),
  )
  await entered.promise
  try {
    await suspendWorkspaceOwner(harness, setup.workspaceId)
  } finally {
    release.resolve()
  }
  expect((await creating).status).toBe(403)
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM preview_hostnames WHERE workspace_id = ?',
    )
      .bind(setup.workspaceId)
      .first('count'),
  ).toBe(0)
})
