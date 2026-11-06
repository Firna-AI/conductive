import { afterEach, beforeEach, expect, it } from 'vitest'

import { DEVICE_SETTINGS_PATH } from '../../src/shared/device'
import { deviceObject, deviceRequired } from '../../src/shared/device-read'
import { deviceFixture, WID, type DeviceFixture } from './runtime.test-support'
import { connected } from './requests.test-support'

let fixture: DeviceFixture
beforeEach(async () => {
  fixture = await deviceFixture()
})
afterEach(async () => {
  await fixture?.dispose()
})

it('relays local settings only to the paired Mac without applying permission rules', async () => {
  const mac = await connected(fixture)
  const browserCurrent = await fixture.app('/api/devices/current')
  expect(browserCurrent.status).toBe(200)
  expect(await browserCurrent.json()).toEqual({ device: null })
  const settings = {
    deviceName: 'Sender Mac',
    alwaysAllowedCommands: [' exact command '],
    workspaceWindows: [
      {
        workspaceId: WID,
        workspaceName: 'Workspace',
        expiresAt: Date.now() + 900_000,
      },
    ],
  }
  const read = fixture.app(
    DEVICE_SETTINGS_PATH,
    undefined,
    fixture.senderToken,
    true,
  )
  const message = deviceObject(await mac.inbox.next())
  expect(message).toMatchObject({
    type: 'settings.operation',
    operation: { action: 'read' },
  })
  mac.socket.send(
    JSON.stringify({
      type: 'settings.result',
      operationId: 'wrong-operation',
      settings,
    }),
  )
  mac.socket.send(
    JSON.stringify({
      type: 'settings.result',
      operationId: deviceRequired(message.operationId),
      settings,
    }),
  )
  const response = await read
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ ...mac.device, settings })
  const other = await fixture.tokenFor('sender', 'unpaired')
  expect(
    (
      await fixture.app(
        DEVICE_SETTINGS_PATH,
        {
          ...mac.device,
          operation: { action: 'remove-command', command: ' exact command ' },
        },
        other,
        true,
      )
    ).status,
  ).toBe(409)
  for (const operation of [
    { action: 'remove-command', command: ' exact command ' },
    { action: 'stop-workspace', workspaceId: WID },
  ] as const) {
    const pending = fixture.app(
      DEVICE_SETTINGS_PATH,
      { ...mac.device, operation },
      fixture.senderToken,
      true,
    )
    const relay = deviceObject(await mac.inbox.next())
    expect(relay).toMatchObject({ type: 'settings.operation', operation })
    mac.socket.send(
      JSON.stringify({
        type: 'settings.result',
        operationId: deviceRequired(relay.operationId),
        settings: {
          ...settings,
          alwaysAllowedCommands: [],
          workspaceWindows: [],
        },
      }),
    )
    expect((await pending).status).toBe(200)
  }
})
