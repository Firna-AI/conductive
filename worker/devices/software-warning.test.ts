import { afterEach, beforeEach, expect, it } from 'vitest'

import { workspaceEventsPath } from '../../src/shared/events'
import { SocketInbox } from '../chat/adapter-sockets.test-support'
import { recordWorkspaceSoftwareUpdateFailed } from '../lifecycle/workspace-software-data'
import { command, connected } from './requests.test-support'
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

// The fixture workspace has no lifecycle state, so the device-only fallback
// publishes this event.
it('keeps the stored software warning in the workspace event of a Mac request', async () => {
  await recordWorkspaceSoftwareUpdateFailed(fixture.db, 'org', WID, true)
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
  await command(fixture, mac)
  expect(await inbox.next()).toMatchObject({
    type: 'event',
    envelope: {
      event: {
        type: 'workspace.updated',
        workspace: { state: 'input', softwareUpdateFailed: true },
      },
    },
  })
})
