import type { WebSocket } from 'miniflare'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { workspaceEventsPath } from '../../src/shared/events'
import { workspacePaths } from '../../src/shared/workspaces'
import { closeSockets, SocketInbox } from '../chat/adapter-sockets.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { featureFixture, type FeatureFixture } from './fixture.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
const sockets: WebSocket[] = []
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await closeSockets(...sockets)
  sockets.length = 0
  await fixture?.dispose()
})

it('publishes one durable revocation per preview on expiry and archive through the shared workspace socket', async () => {
  const active = (fixture = await featureFixture(bundle))
  await active.env.DB.prepare(
    "UPDATE workspaces SET sandbox_id = 'bx_preview' WHERE id = ?",
  )
    .bind(OUTER_WORKSPACE)
    .run()
  const tabs: SocketInbox[] = []
  for (let index = 0; index < 2; index++) {
    const response = await active.request(
      workspaceEventsPath(OUTER_ORG, OUTER_WORKSPACE),
      { headers: { Upgrade: 'websocket' } },
    )
    if (!response.webSocket) throw new Error('Missing workspace socket')
    sockets.push(response.webSocket)
    const inbox = new SocketInbox(response.webSocket)
    response.webSocket.accept()
    await inbox.next()
    tabs.push(inbox)
  }
  const insert = (id: string, hostname: string, expiresAt: number) =>
    active.env.DB.prepare(
      'INSERT INTO preview_hostnames (id, hostname, org_id, workspace_id, port, created_at, expires_at) VALUES (?, ?, ?, ?, 3000, 1, ?)',
    )
      .bind(id, hostname, OUTER_ORG, OUTER_WORKSPACE, expiresAt)
      .run()
  await insert('expired-preview', `${'a'.repeat(32)}.preview.test`, 1)
  await active.actor().seedFeatureState({
    'previews:workspace-id': OUTER_WORKSPACE,
    'alarm:previews': 0,
  })
  await active.actor().advanceStartAlarm()
  for (const inbox of tabs)
    expect(await inbox.next()).toMatchObject({
      type: 'event',
      envelope: {
        eventNumber: 1,
        event: { type: 'preview.revoked', previewId: 'expired-preview' },
      },
    })
  await active.actor().advanceStartAlarm()
  expect(await active.actor().readChatWorkspaceSummary()).toMatchObject({
    throughEventNumber: 1,
  })
  await insert(
    'archived-preview',
    `${'b'.repeat(32)}.preview.test`,
    Date.now() + 86_400_000,
  )
  active.boat.synchronousOutput = '\0' + '0\n'
  const archive = await active.request(
    workspacePaths.archive(OUTER_ORG, OUTER_WORKSPACE),
    { method: 'POST', body: JSON.stringify({ discardUnpushedWork: false }) },
  )
  expect(archive.status).toBe(200)
  for (const inbox of tabs)
    expect(await inbox.next()).toMatchObject({
      type: 'event',
      envelope: {
        eventNumber: 2,
        event: { type: 'preview.revoked', previewId: 'archived-preview' },
      },
    })
  expect(await active.actor().readChatWorkspaceSummary()).toMatchObject({
    throughEventNumber: 3,
  })
})
