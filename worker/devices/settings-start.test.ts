import { afterEach, beforeEach, expect, it } from 'vitest'

import { DEVICE_SETTINGS_PATH } from '../../src/shared/device'
import { deviceObject } from '../../src/shared/device-read'
import { deviceFixture, WID, type DeviceFixture } from './runtime.test-support'
import { connected, sendFrame } from './requests.test-support'

let fixture: DeviceFixture
beforeEach(async () => {
  fixture = await deviceFixture()
})
afterEach(async () => {
  await fixture?.dispose()
})

it('refuses starts outside the paired page and for absent, archived, or foreign workspaces and suspended orgs', async () => {
  const mac = await connected(fixture)
  const body = {
    ...mac.device,
    operation: { action: 'start-workspace-until-stop', workspaceId: WID },
  }
  expect((await fixture.app(DEVICE_SETTINGS_PATH, body)).status).toBe(403)
  const unpaired = await fixture.tokenFor('sender', 'unpaired')
  expect(
    (await fixture.app(DEVICE_SETTINGS_PATH, body, unpaired, true)).status,
  ).toBe(409)
  const cases = [
    {
      id: 'missing',
      sql: 'SELECT 1',
      code: 'workspace_not_found',
      status: 404,
    },
    {
      id: WID,
      sql: 'UPDATE workspaces SET archived_at = 1 WHERE id = ?',
      code: 'workspace_not_found',
      status: 404,
    },
    {
      id: WID,
      sql: "UPDATE workspaces SET archived_at = NULL, state = 'archived' WHERE id = ?",
      code: 'workspace_not_found',
      status: 404,
    },
    {
      id: WID,
      sql: "UPDATE orgs SET suspended_at = 1 WHERE id = 'org' AND ? IS NOT NULL",
      code: 'org_suspended',
      status: 403,
    },
    {
      id: WID,
      sql: "DELETE FROM org_members WHERE org_id = 'org' AND user_id = 'sender' AND ? IS NOT NULL",
      code: 'org_not_found',
      status: 404,
    },
    {
      id: WID,
      sql: 'DELETE FROM workspaces WHERE id = ?',
      code: 'workspace_not_found',
      status: 404,
    },
  ]
  for (const item of cases) {
    await fixture.db.batch([
      fixture.db
        .prepare(
          "UPDATE workspaces SET archived_at = NULL, state = 'working' WHERE id = ?",
        )
        .bind(WID),
      fixture.db.prepare(
        "UPDATE orgs SET suspended_at = NULL WHERE id = 'org'",
      ),
    ])
    const statement = fixture.db.prepare(item.sql)
    await (item.id === 'missing' ? statement : statement.bind(WID)).run()
    const response = await fixture.app(
      DEVICE_SETTINGS_PATH,
      { ...body, operation: { ...body.operation, workspaceId: item.id } },
      fixture.senderToken,
      true,
    )
    expect(response.status, item.sql).toBe(item.status)
    expect(await response.json()).toMatchObject({ error: { code: item.code } })
  }
  await sendFrame(mac, { type: 'device.ping' })
})

it('starts with stored Mac access off and adds only the stored name without trusting page metadata', async () => {
  const mac = await connected(fixture)
  await fixture.db
    .prepare("UPDATE workspaces SET name = '', mac_access = 0 WHERE id = ?")
    .bind(WID)
    .run()
  for (const action of [
    'start-workspace-until-stop',
    'keep-workspace',
    'extend-workspace',
  ]) {
    const pending = fixture.app(
      DEVICE_SETTINGS_PATH,
      {
        ...mac.device,
        operation: {
          action,
          workspaceId: WID,
          workspaceName: 'spoofed',
        },
      },
      fixture.senderToken,
      true,
    )
    const message = deviceObject(
      await Promise.race([
        mac.inbox.next(),
        pending.then((response) => {
          expect(response.status).toBe(200)
          return response.json()
        }),
      ]),
    )
    await sendFrame(mac, {
      type: 'settings.result',
      operationId: String(message.operationId),
      settings: {
        deviceName: 'Mac',
        alwaysAllowedCommands: [],
        workspaceWindows: [],
      },
      outcome: { status: 'done' },
    })
    expect((await pending).status).toBe(200)
    expect(message.operation).toEqual({
      action,
      workspaceId: WID,
      ...(action === 'start-workspace-until-stop' && { workspaceName: null }),
    })
  }
})
