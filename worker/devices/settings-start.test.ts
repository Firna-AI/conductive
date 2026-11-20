import { afterEach, beforeEach, expect, it } from 'vitest'

import { DEVICE_SETTINGS_PATH } from '../../src/shared/device'
import {
  deviceObject,
  readDeviceSettingsResponse,
} from '../../src/shared/device-read'
import { deviceFixture, WID, type DeviceFixture } from './runtime.test-support'
import { connected, sendFrame } from './requests.test-support'

let fixture: DeviceFixture
beforeEach(async () => {
  fixture = await deviceFixture()
})
afterEach(async () => {
  await fixture?.dispose()
})

it('refuses starts outside the paired page and for absent, archived, foreign, or disabled workspaces', async () => {
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
      sql: "UPDATE workspaces SET state = 'working', mac_access = 0 WHERE id = ?",
      code: 'mac_access_off',
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

it('adds the stored name and period to Start, Keep, and Extend without trusting page metadata', async () => {
  const mac = await connected(fixture)
  await fixture.db
    .prepare(
      "UPDATE workspaces SET name = '', mac_access_period = 9 WHERE id = ?",
    )
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
          macAccessPeriod: 100,
        },
      },
      fixture.senderToken,
      true,
    )
    const message = deviceObject(await mac.inbox.next())
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
      macAccessPeriod: 9,
      ...(action === 'start-workspace-until-stop' && { workspaceName: null }),
    })
  }
})

it('filters only grants older than the current period in reads and changes and keeps legacy grants', async () => {
  const mac = await connected(fixture)
  await fixture.db
    .prepare('UPDATE workspaces SET mac_access_period = 3 WHERE id = ?')
    .bind(WID)
    .run()
  const grants = [
    {
      workspaceId: WID,
      workspaceName: 'Old',
      expiresAt: null,
      macAccessPeriod: 2,
    },
    {
      workspaceId: WID,
      workspaceName: 'Current',
      expiresAt: null,
      macAccessPeriod: 3,
    },
    {
      workspaceId: WID,
      workspaceName: 'Newer',
      expiresAt: null,
      macAccessPeriod: 4,
    },
    { workspaceId: WID, workspaceName: 'Legacy', expiresAt: null },
  ]
  for (const operation of [
    undefined,
    { action: 'stop-workspace', workspaceId: WID },
  ]) {
    const pending = fixture.app(
      DEVICE_SETTINGS_PATH,
      operation && { ...mac.device, operation },
      fixture.senderToken,
      true,
    )
    const message = deviceObject(await mac.inbox.next())
    await sendFrame(mac, {
      type: 'settings.result',
      operationId: String(message.operationId),
      settings: {
        deviceName: 'Mac',
        alwaysAllowedCommands: [],
        workspaceWindows: grants,
      },
      outcome: { status: 'done' },
    })
    const response = await pending
    expect(response.status).toBe(200)
    expect(
      readDeviceSettingsResponse(await response.json()).settings
        .workspaceWindows,
    ).toEqual(grants.slice(1))
  }
})
