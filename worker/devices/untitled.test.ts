import { afterEach, beforeEach, expect, it } from 'vitest'

import { workspaceEventsPath } from '../../src/shared/events'
import { SocketInbox } from '../chat/adapter-sockets.test-support'
import { connected, stored } from './requests.test-support'
import {
  APP,
  deviceFixture,
  WID,
  type DeviceFixture,
} from './runtime.test-support'

let fixture: DeviceFixture
beforeEach(async () => {
  fixture = await deviceFixture()
})
afterEach(async () => {
  await fixture?.dispose()
})

it('keeps an untitled workspace name null in Mac requests, durable reads, and workspace events', async () => {
  await fixture.db
    .prepare("UPDATE workspaces SET name = '' WHERE id = ?")
    .bind(WID)
    .run()
  const mac = await connected(fixture)
  const response = await fixture.runtime.dispatchFetch(
    APP + workspaceEventsPath('org', WID),
    {
      headers: { ...fixture.appHeaders(), Upgrade: 'websocket' },
    },
  )
  if (!response.webSocket) throw new Error('Missing workspace stream.')
  fixture.remember(response.webSocket)
  const inbox = new SocketInbox(response.webSocket)
  response.webSocket.accept()
  await inbox.next()
  const command = await fixture.machine(fixture.input())
  expect(command.status).toBe(202)
  expect(await command.json()).toMatchObject({
    request: { workspaceName: null },
  })
  expect(await mac.inbox.next()).toMatchObject({
    type: 'command.request',
    request: { workspaceName: null },
  })
  expect((await stored(fixture)).workspaceName).toBeNull()
  expect(await inbox.next()).toMatchObject({
    type: 'event',
    envelope: {
      event: { type: 'workspace.updated', workspace: { name: null } },
    },
  })
})
