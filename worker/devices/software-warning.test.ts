import { afterEach, beforeEach, expect, it } from 'vitest'

import { workspaceEventsPath } from '../../src/shared/events'
import { SocketInbox } from '../chat/adapter-sockets.test-support'
import { OUTER_SOFTWARE } from '../chat/integration/outer-seed.test-support'
import { seedPublishedImage } from '../lifecycle/published-image-test-support'
import {
  recordWorkspaceInstallScriptRevision,
  recordWorkspaceSoftwareUpdateFailed,
} from '../lifecycle/workspace-software-data'
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
it('keeps the software warning and current install script report in Mac request workspace events', async () => {
  await seedPublishedImage(fixture.db, {
    orgId: 'org',
    buildId: 'current-script-build',
    imageName: 'current-script-image',
    repositories: [],
    software: OUTER_SOFTWARE,
    now: 1,
  })
  await fixture.db
    .prepare(
      `UPDATE image_builds SET install_script_revision = 'current-script'
       WHERE id = 'current-script-build'`,
    )
    .run()
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
        workspace: {
          state: 'input',
          softwareUpdateFailed: true,
          installScriptChanged: true,
        },
      },
    },
  })
  await recordWorkspaceInstallScriptRevision(
    fixture.db,
    'org',
    WID,
    'current-script',
  )
  await command(fixture, mac, 'same-script-command')
  expect(await inbox.next()).toMatchObject({
    type: 'event',
    envelope: {
      event: {
        type: 'workspace.updated',
        workspace: {
          state: 'input',
          softwareUpdateFailed: true,
          installScriptChanged: false,
        },
      },
    },
  })
})
