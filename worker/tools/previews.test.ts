import type { WebSocket } from 'miniflare'
import { afterEach, beforeAll, expect, it } from 'vitest'

import {
  agentPreviewsPath,
  agentPreviewClosePath,
} from '../../src/shared/agent-previews'
import {
  previewPath,
  previewsPath,
  PREVIEW_RELAY_PORT,
} from '../../src/shared/previews'
import { workspaceEventsPath } from '../../src/shared/events'
import { closeSockets, SocketInbox } from '../chat/adapter-sockets.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_WORKSPACE,
  OUTER_TOKEN,
} from '../chat/integration/outer-seed.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { record, string } from '../chat/inputs'
import { machineRead } from './session-management.test-support'
import {
  previewToolFixture,
  seedForeignPreviewWorkspace,
  type PreviewToolFixture,
} from './previews.test-support'

let bundle: string
let fixture: PreviewToolFixture | undefined
const sockets: WebSocket[] = []
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await closeSockets(...sockets)
  sockets.length = 0
  await fixture?.dispose()
})

it('opens signed-in preview links and lists and closes member previews through the real workspace', async () => {
  const active = (fixture = await previewToolFixture(bundle))
  const opened = await active.post(agentPreviewsPath(OTHER_WORKSPACE), {
    port: 3000,
    public: true,
    requiresSignIn: false,
    senderUserId: 'outsider',
  })
  expect(opened.status).toBe(201)
  const preview = record(record(await opened.json()).preview)
  const id = string(preview.id)
  const url = string(preview.url)
  expect(preview).toEqual({
    id,
    port: 3000,
    url: `${active.env.APP_ORIGIN}${previewPath(OUTER_ORG, OTHER_WORKSPACE, id)}`,
    expiresAt: DEVICE_TEST_NOW + 86_400_000,
  })
  expect(opened.headers.get('Cache-Control')).toBe('no-store')
  const unsigned = await active.runtime.dispatchFetch(url, {
    headers: { Authorization: `Bearer ${OUTER_TOKEN}` },
  })
  expect(unsigned.status).toBe(401)
  expect(await unsigned.json()).toMatchObject({
    error: { code: 'sign_in_required' },
  })
  const launched = await active.request(new URL(url).pathname, {
    headers: {
      Cookie: active.cookies.memberCookie,
      Accept: 'application/json',
    },
  })
  expect(launched.status).toBe(200)
  expect(new URL(string(record(await launched.json()).url)).origin).toBe(
    'https://authorize.preview.test',
  )
  const appOpened = await active.request(
    previewsPath(OUTER_ORG, OTHER_WORKSPACE),
    { method: 'POST', body: JSON.stringify({ port: 3000 }) },
  )
  expect(appOpened.status).toBe(201)
  const appPreview = record(record(await appOpened.json()).preview)
  expect(appPreview.id).not.toBe(id)
  const list = await machineRead(active, agentPreviewsPath(OTHER_WORKSPACE))
  expect(list.status).toBe(200)
  expect(record(await list.json()).previews).toEqual(
    expect.arrayContaining([preview, appPreview]),
  )
  const tab = await active.request(
    workspaceEventsPath(OUTER_ORG, OTHER_WORKSPACE),
    { headers: { Upgrade: 'websocket' } },
  )
  if (!tab.webSocket)
    throw new Error('The preview workspace socket is missing.')
  sockets.push(tab.webSocket)
  const inbox = new SocketInbox(tab.webSocket)
  tab.webSocket.accept()
  await inbox.next()
  const closed = await active.post(
    agentPreviewClosePath(OTHER_WORKSPACE, string(appPreview.id)),
    {},
  )
  expect(closed.status).toBe(200)
  expect(await closed.json()).toMatchObject({
    workspace: { id: OTHER_WORKSPACE },
    closed: true,
  })
  expect(await inbox.next()).toMatchObject({
    type: 'event',
    envelope: { event: { type: 'preview.revoked', previewId: appPreview.id } },
  })
  const repeated = await active.post(
    agentPreviewClosePath(OTHER_WORKSPACE, string(appPreview.id)),
    {},
  )
  expect(repeated.status).toBe(200)
  expect(await repeated.json()).toMatchObject({ closed: false })
  expect(
    (await (await active.actor(OTHER_WORKSPACE)).readChatWorkspaceSummary())
      .throughEventNumber,
  ).toBe(1)
  const wrongWorkspace = await active.post(
    agentPreviewClosePath(undefined, id),
    {},
  )
  expect(wrongWorkspace.status).toBe(200)
  expect(await wrongWorkspace.json()).toMatchObject({ closed: false })
  expect(
    record(
      await (
        await machineRead(active, agentPreviewsPath(OTHER_WORKSPACE))
      ).json(),
    ).previews,
  ).toEqual([preview])
  expect(active.hosted).toEqual([PREVIEW_RELAY_PORT, PREVIEW_RELAY_PORT])
  await seedForeignPreviewWorkspace(active)
  for (const response of [
    await machineRead(active, agentPreviewsPath('foreign-preview-workspace')),
    await active.post(agentPreviewsPath('foreign-preview-workspace'), {
      port: 3000,
    }),
    await active.post(
      agentPreviewClosePath('foreign-preview-workspace', id),
      {},
    ),
  ]) {
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: { code: 'workspace_not_found' },
    })
  }
  expect(
    record(
      await (
        await machineRead(active, agentPreviewsPath(OTHER_WORKSPACE))
      ).json(),
    ).previews,
  ).toEqual([preview])
  expect(active.hosted).toEqual([PREVIEW_RELAY_PORT, PREVIEW_RELAY_PORT])
})

it('keeps suspended-owner preview metadata available while refusing opens before provider access', async () => {
  const active = (fixture = await previewToolFixture(bundle))
  const opened = await active.post(agentPreviewsPath(OTHER_WORKSPACE), {
    port: 3000,
  })
  expect(opened.status).toBe(201)
  const preview = record(record(await opened.json()).preview)
  await active.env.DB.batch([
    active.env.DB.prepare(
      "UPDATE workspaces SET owner_user_id = 'member' WHERE id = ?",
    ).bind(OUTER_WORKSPACE),
    active.env.DB.prepare(
      "UPDATE users SET suspended_at = ? WHERE id = 'owner'",
    ).bind(DEVICE_TEST_NOW),
  ])
  const before = active.requests.length
  const denied = await active.post(agentPreviewsPath(OTHER_WORKSPACE), {
    port: 3001,
  })
  expect(denied.status).toBe(403)
  expect(await denied.json()).toEqual({
    error: {
      code: 'user_suspended',
      message:
        'The workspace owner is suspended. Ask an admin to assign another member.',
    },
  })
  expect(active.requests).toHaveLength(before)
  const list = await machineRead(active, agentPreviewsPath(OTHER_WORKSPACE))
  expect(list.status).toBe(200)
  expect(record(await list.json()).previews).toEqual([preview])
  const closed = await active.post(
    agentPreviewClosePath(OTHER_WORKSPACE, string(preview.id)),
    {},
  )
  expect(closed.status).toBe(200)
  expect(await closed.json()).toMatchObject({ closed: true })
  await active.env.DB.batch([
    active.env.DB.prepare(
      "UPDATE users SET suspended_at = NULL WHERE id = 'owner'",
    ),
    active.env.DB.prepare(
      "UPDATE workspaces SET state = 'stopped' WHERE id = ?",
    ).bind(OTHER_WORKSPACE),
  ])
  const stopped = await active.post(agentPreviewsPath(OTHER_WORKSPACE), {
    port: 3000,
  })
  expect(stopped.status).toBe(409)
  expect(await stopped.json()).toMatchObject({
    error: { code: 'sandbox_not_ready' },
  })
  expect(active.requests).toHaveLength(before)
  expect(active.boat.starts).toHaveLength(0)
})
