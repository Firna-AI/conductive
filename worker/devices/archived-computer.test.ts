import { afterEach, beforeEach, expect, it } from 'vitest'

import { readEnvelope } from '../../src/chat/api/read-workspace'
import { deviceObject } from '../../src/shared/device-read'
import { workspaceEventsPath } from '../../src/shared/events'
import { SocketInbox } from '../chat/adapter-sockets.test-support'
import { TEST_TIME } from '../test-support/harness'
import { command, connected, ref } from './requests.test-support'
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

it('keeps unresolved computer evidence in the device fallback event after Archive', async () => {
  const mac = await connected(fixture)
  const response = await fixture.runtime.dispatchFetch(
    APP + workspaceEventsPath('org', WID),
    { headers: { ...fixture.appHeaders(), Upgrade: 'websocket' } },
  )
  if (!response.webSocket) throw new Error('Missing workspace stream.')
  fixture.remember(response.webSocket)
  const inbox = new SocketInbox(response.webSocket)
  response.webSocket.accept()
  await inbox.next()
  await command(fixture, mac)
  await inbox.next()
  await fixture.db.batch([
    fixture.db
      .prepare(
        "UPDATE workspaces SET state = 'archived', archived_at = ? WHERE id = ?",
      )
      .bind(TEST_TIME, WID),
    fixture.db
      .prepare(
        `INSERT INTO computer_ledger
         (allocation_key, provider_account, org_id, purpose, purpose_id)
         VALUES ('unresolved-device-archive', 'boat', 'org', 'workspace', ?)`,
      )
      .bind(WID),
  ])
  mac.socket.send(JSON.stringify({ type: 'command.denied', ...ref() }))
  await mac.settle()
  expect(await mac.inbox.next()).toEqual({ type: 'command.cancel', ...ref() })
  const event = readEnvelope(deviceObject(await inbox.next()).envelope).event
  expect(event).toMatchObject({
    type: 'workspace.updated',
    workspace: {
      state: 'archived',
      restoreUntil: null,
      archivedComputer: {
        state: 'may-exist',
        restoreUntil: TEST_TIME + 1_209_600_000,
      },
    },
  })
})
